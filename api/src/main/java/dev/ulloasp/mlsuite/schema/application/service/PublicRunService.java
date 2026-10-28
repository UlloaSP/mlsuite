package dev.ulloasp.mlsuite.schema.application.service;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultFeedbackRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.application.dto.PublicRunDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicRunFeedbackRequest;
import dev.ulloasp.mlsuite.schema.application.port.in.PublicRunUseCase;
import dev.ulloasp.mlsuite.schema.application.service.PublicForm.ReportRoute;
import dev.ulloasp.mlsuite.schema.application.service.PublicPredictionPlan.ModelCall;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResult;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedback;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedbackType;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultStatus;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunOrigin;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunStatus;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.security.identity.PublicCaller;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.util.CatalogPages;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.visitor.adapter.out.persistence.repository.VisitorRepository;
import dev.ulloasp.mlsuite.visitor.domain.model.Visitor;
import lombok.RequiredArgsConstructor;

/**
 * The runs made on public pages, kept for good as the organization's own inferences and read
 * back only by the browser that made them. A run belongs to a visitor, who is the browser's
 * cookie; an account that is signed in adds its name to the run, and gives its feedback as
 * itself. Everything stored has the shape of a workspace run, so the organization reviews,
 * filters and exports it with the rest. A run is read back as the page can use it: its inputs
 * as an example's are (by field, to fill the form again) and its reports under the public
 * form's keys.
 */
@Service
@Transactional
@RequiredArgsConstructor
public class PublicRunService implements PublicRunUseCase {

    /** The most runs read back at once: the session a page shows, newest first. */
    static final int SESSION_SIZE = 100;

    private final PublicBookmarkService publicBookmarks;
    private final SchemaBookmarkRepository bookmarkRepository;
    private final PredictionRunRepository runRepository;
    private final PredictionResultRepository resultRepository;
    private final PredictionResultFeedbackRepository feedbackRepository;
    private final FeedbackHistory history;
    private final ModelRepository modelRepository;
    private final VisitorRepository visitorRepository;
    private final UserLookupService userLookupService;
    private final PublicRunCatalogSearch catalogSearch;

    /**
     * How stale a visitor's last-seen time may be. Concurrent runs of one visitor would otherwise
     * all update its row and wait for each other's lock, holding pooled connections while they wait.
     */
    static final Duration SEEN_PRECISION = Duration.ofMinutes(15);

    /**
     * A run kept, whether it started a new visitor whose id the browser must be given, and when
     * that visitor had last been seen before it.
     */
    public record Recorded(PublicRunDto run, UUID visitorId, boolean issued, OffsetDateTime lastSeenAt) {
    }

    /** Keeps a run the runtime answered. {@code answers} are the runtime's replies by model. */
    public Recorded record(PublicPredictionPlan plan, Map<Long, Map<String, Object>> answers, PublicCaller caller) {
        SchemaBookmark bookmark = bookmarkRepository.findById(plan.bookmarkId())
                .filter(found -> found.getVersion().getId().equals(plan.versionId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                        "This bookmark changed while it ran. Reload the page and run it again."));
        OffsetDateTime now = OffsetDateTime.now();
        Optional<Visitor> known = Optional.ofNullable(caller.visitorId()).flatMap(visitorRepository::findById);
        Visitor visitor = known.orElseGet(() -> visitorRepository.save(new Visitor(UUID.randomUUID(), now)));

        PredictionRun run = new PredictionRun(bookmark, bookmark.getVersion(), runName(now), plan.storedInputs(),
                PredictionRunStatus.SUCCESS);
        run.setOrigin(PredictionRunOrigin.PUBLIC);
        run.setVisitor(visitor);
        if (caller.signedIn()) {
            User user = userLookupService.requireById(caller.userId());
            run.setCreatedByName(user.getFullName());
            run.setCreatedByEmail(user.getEmail());
        }
        run = runRepository.save(run);
        List<PredictionResult> results = new ArrayList<>();
        for (ModelCall call : plan.calls()) {
            Map<String, Object> output = PublicRunReports.storedOutput(call.modelId(), call.input(),
                    answers.getOrDefault(call.modelId(), Map.of()), plan.reports());
            results.add(resultRepository.save(new PredictionResult(run, modelRepository.findById(call.modelId()).orElseThrow(),
                    call.input(), output, PredictionResultStatus.SUCCESS, null, null)));
        }
        PublicForm form = publicBookmarks.formOf(run.getSchemaVersion());
        return new Recorded(dto(run, form, results, List.of()), visitor.getId(), known.isEmpty(),
                visitor.getLastSeenAt());
    }

    /**
     * Notes that a recorded run's visitor was seen, once its run is committed and only when it
     * was last seen more than {@link #SEEN_PRECISION} ago: most runs write nothing to the visitor.
     */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public void markSeen(Recorded recorded) {
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime since = now.minus(SEEN_PRECISION);
        if (recorded.lastSeenAt().isBefore(since)) {
            visitorRepository.markSeen(recorded.visitorId(), now, since);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<PublicRunDto> list(String publicId, PublicCaller caller) {
        SchemaBookmark bookmark = publicBookmarks.requirePublic(publicId);
        if (caller.visitorId() == null) return List.of();
        List<PredictionRun> runs = runRepository.findByVisitorIdAndSchemaBookmarkIdOrderByCreatedAtDescIdDesc(
                caller.visitorId(), bookmark.getId(), PageRequest.of(0, SESSION_SIZE));
        return dtos(runs, caller);
    }

    @Override
    @Transactional(readOnly = true)
    public PageDto<PublicRunDto> catalog(String publicId, PublicCaller caller, CatalogRequest request) {
        SchemaBookmark bookmark = publicBookmarks.requirePublic(publicId);
        if (caller.visitorId() == null) {
            return new PageDto<>(List.of(), request.page(), request.size(), 0, false);
        }
        Specification<PredictionRun> owned = (root, query, builder) -> builder.and(
                builder.equal(root.get("visitor").get("id"), caller.visitorId()),
                builder.equal(root.get("schemaBookmark").get("id"), bookmark.getId()));
        Sort newestFirst = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("id"));
        if (request.search().isEmpty()) {
            Page<PredictionRun> page = runRepository.findAll(owned, CatalogPages.pageable(request, newestFirst));
            return PageDto.of(page, dtos(page.getContent(), caller));
        }
        PageDto<Long> page = CatalogPages.page(catalogSearch.matchingIds(caller.visitorId(), bookmark.getId(),
                request.search()), request);
        Map<Long, PredictionRun> found = runRepository.findAllById(page.items()).stream()
                .collect(Collectors.toMap(PredictionRun::getId, Function.identity()));
        return new PageDto<>(dtos(page.items().stream().map(found::get).filter(Objects::nonNull).toList(), caller),
                page.page(), page.size(), page.totalItems(),
                page.hasNext());
    }

    private List<PublicRunDto> dtos(List<PredictionRun> runs, PublicCaller caller) {
        if (runs.isEmpty()) return List.of();
        List<Long> runIds = runs.stream().map(PredictionRun::getId).toList();
        Map<Long, List<PredictionResult>> results = resultRepository.findByRunIdInOrderByRunIdAscIdAsc(runIds).stream()
                .collect(Collectors.groupingBy(result -> result.getRun().getId()));
        Map<Long, List<PredictionResultFeedback>> feedback = ownFeedback(runIds, caller).stream()
                .collect(Collectors.groupingBy(item -> item.getResult().getRun().getId()));
        Map<Long, PublicForm> forms = new HashMap<>();
        return runs.stream().map(run -> dto(run,
                forms.computeIfAbsent(run.getSchemaVersion().getId(), id -> publicBookmarks.formOf(run.getSchemaVersion())),
                results.getOrDefault(run.getId(), List.of()),
                feedback.getOrDefault(run.getId(), List.of()))).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PublicRunDto get(String publicId, Long runId, PublicCaller caller) {
        PredictionRun run = ownRun(publicId, runId, caller);
        return dto(run, publicBookmarks.formOf(run.getSchemaVersion()),
                resultRepository.findByRunIdOrderByIdAsc(runId), ownFeedback(List.of(runId), caller));
    }

    @Override
    public PublicRunDto saveFeedback(String publicId, Long runId, PublicRunFeedbackRequest request, PublicCaller caller) {
        PredictionRun run = ownRun(publicId, runId, caller);
        PublicForm form = publicBookmarks.formOf(run.getSchemaVersion());
        List<PredictionResult> results = resultRepository.findByRunIdOrderByIdAsc(runId);
        User user = caller.signedIn() ? userLookupService.requireById(caller.userId()) : null;
        for (PublicRunFeedbackRequest.Item item : request.items()) {
            ReportRoute route = form.reportRoutes().stream()
                    .filter(candidate -> candidate.key().equals(item.reportKey()))
                    .findFirst()
                    .orElseThrow(() -> badRequest("The run has no report \"%s\".".formatted(item.reportKey())));
            boolean asked = item.type() == PredictionResultFeedbackType.EXPLANATION ? route.questioned() : route.assessed();
            if (!asked) throw badRequest("Report \"%s\" takes no %s feedback.".formatted(item.reportKey(), item.type()));
            if (!item.value().isObject()) throw badRequest("Feedback must be an object of answers.");
            PredictionResult result = results.stream()
                    .filter(candidate -> candidate.getModel().getId().equals(route.modelId()))
                    .findFirst()
                    .orElseThrow(() -> badRequest("The run has no result for report \"%s\".".formatted(item.reportKey())));
            PredictionResultFeedback feedback = (user != null
                    ? feedbackRepository.findByResultIdAndUserIdAndTypeAndOrderAndReviewIsNull(result.getId(), user.getId(),
                            item.type(), route.order())
                    : feedbackRepository.findByResultIdAndVisitorIdAndTypeAndOrder(result.getId(), run.getVisitor().getId(), item.type(), route.order()))
                    .orElseGet(() -> user != null
                            ? new PredictionResultFeedback(result, user, item.type(), route.order(), item.value())
                            : new PredictionResultFeedback(result, run.getVisitor(), item.type(), route.order(), item.value()));
            feedback.setValue(item.value());
            history.save(feedback, user == null ? null : user.getId());
        }
        return dto(run, form, results, ownFeedback(List.of(runId), caller));
    }

    private PredictionRun ownRun(String publicId, Long runId, PublicCaller caller) {
        SchemaBookmark bookmark = publicBookmarks.requirePublic(publicId);
        return runRepository.findById(runId)
                .filter(run -> run.getVisitor() != null && run.getVisitor().getId().equals(caller.visitorId()))
                .filter(run -> run.getSchemaBookmark() != null && run.getSchemaBookmark().getId().equals(bookmark.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Run not found"));
    }

    private List<PredictionResultFeedback> ownFeedback(List<Long> runIds, PublicCaller caller) {
        if (caller.signedIn()) {
            return feedbackRepository.findByResultRunIdInAndUserIdAndReviewIsNullOrderByIdAsc(runIds, caller.userId());
        }
        if (caller.visitorId() == null) return List.of();
        return feedbackRepository.findByResultRunIdInAndVisitorIdOrderByIdAsc(runIds, caller.visitorId());
    }

    private static PublicRunDto dto(PredictionRun run, PublicForm form, List<PredictionResult> results,
            List<PredictionResultFeedback> feedback) {
        return new PublicRunDto(run.getId(), run.getSchemaVersion().getVersion(), run.getCreatedAt(),
                PublicExampleInputs.of(run.getSchemaVersion().getFormSchema(), run.getInputData()),
                PublicRunReports.of(form.reportRoutes(), results),
                PublicRunReports.feedback(form.reportRoutes(), feedback));
    }

    private static String runName(OffsetDateTime now) {
        return "visitor-" + now.toInstant() + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
