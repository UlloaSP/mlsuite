package dev.ulloasp.mlsuite.schema.application.service;

import jakarta.annotation.Nullable;
import dev.ulloasp.mlsuite.principal.adapter.out.persistence.repository.PrincipalRepository;
import dev.ulloasp.mlsuite.principal.application.service.Principals;
import dev.ulloasp.mlsuite.principal.domain.model.Principal;
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

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;
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
import dev.ulloasp.mlsuite.util.CatalogPages;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
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
    private final PrincipalRepository principalRepository;
    private final PublicRunCatalogSearch catalogSearch;
    private final AuditLogService auditLog;
    private final Principals principals;

    /**
     * How stale a visitor's last-seen time may be. Concurrent runs of one visitor would otherwise
     * all update its row and wait for each other's lock, holding pooled connections while they wait.
     */
    static final Duration SEEN_PRECISION = Duration.ofMinutes(15);

    /**
     * A run kept, whether it started a new visitor whose id the browser must be given, and when
     * that visitor had last been seen before it.
     */
    public record Recorded(PublicRunDto run, @Nullable UUID visitorId, boolean issued, @Nullable OffsetDateTime lastSeenAt) {
    }

    /** Keeps a run the runtime answered. {@code answers} are the runtime's replies by model. */
    public Recorded record(PublicPredictionPlan plan, Map<Long, Map<String, Object>> answers, PublicCaller caller) {
        SchemaBookmark bookmark = bookmarkRepository.findById(plan.bookmarkId())
                .filter(found -> found.getVersion().getId().equals(plan.versionId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                        "This bookmark changed while it ran. Reload the page and run it again."));
        OffsetDateTime now = OffsetDateTime.now();
        // A browser without a cookie naming a known visitor is a visitor met now, and is given one.
        boolean issued = !caller.signedIn() && (caller.visitorId() == null
                || principalRepository.findByVisitorToken(caller.visitorId()).isEmpty());
        UUID visitorId = caller.signedIn() ? null : issued ? UUID.randomUUID() : caller.visitorId();
        Principal author = caller.signedIn() ? principals.user(caller.userId()) : principals.visitor(visitorId, now);

        PredictionRun run = new PredictionRun(bookmark, bookmark.getVersion(), runName(now), plan.storedInputs(),
                PredictionRunStatus.SUCCESS, author);
        run.setOrigin(PredictionRunOrigin.PUBLIC);
        run = runRepository.save(run);
        List<PredictionResult> results = new ArrayList<>();
        for (ModelCall call : plan.calls()) {
            Map<String, Object> output = PublicRunReports.storedOutput(call.modelId(), call.input(),
                    answers.getOrDefault(call.modelId(), Map.of()), plan.reports());
            results.add(resultRepository.save(new PredictionResult(run, modelRepository.findById(call.modelId()).orElseThrow(),
                    call.input(), output, PredictionResultStatus.SUCCESS, null, null)));
        }
        auditLog.record(actor(caller), bookmark.getSchema().getOrganization().getId(), AuditAction.PREDICTION_RUN,
                bookmark.getId(), AuditDetails.of("runId", run.getId(), "schemaVersionId", plan.versionId(),
                        "status", run.getStatus()));
        PublicForm form = publicBookmarks.formOf(run.getSchemaVersion());
        return new Recorded(dto(run, form, results, List.of()), visitorId, issued,
                author.getLastSeenAt());
    }

    /**
     * Notes that a recorded run's visitor was seen, once its run is committed and only when it
     * was last seen more than {@link #SEEN_PRECISION} ago: most runs write nothing to the visitor.
     */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public void markSeen(Recorded recorded) {
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime since = now.minus(SEEN_PRECISION);
        if (recorded.visitorId() != null && recorded.lastSeenAt().isBefore(since)) {
            principalRepository.markSeen(recorded.visitorId(), now, since);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<PublicRunDto> list(String publicId, PublicCaller caller) {
        SchemaBookmark bookmark = publicBookmarks.requirePublic(publicId);
        Optional<Long> author = sessionAuthor(caller);
        if (author.isEmpty()) return List.of();
        List<PredictionRun> runs = runRepository.findByCreatedByIdAndSchemaBookmarkIdOrderByCreatedAtDescIdDesc(
                author.get(), bookmark.getId(), PageRequest.of(0, SESSION_SIZE));
        return dtos(runs, caller);
    }

    @Override
    @Transactional(readOnly = true)
    public PageDto<PublicRunDto> catalog(String publicId, PublicCaller caller, CatalogRequest request) {
        SchemaBookmark bookmark = publicBookmarks.requirePublic(publicId);
        request.requireNoChoices();
        Optional<Long> author = sessionAuthor(caller);
        if (author.isEmpty()) {
            return new PageDto<>(List.of(), request.page(), request.size(), 0, false);
        }
        Specification<PredictionRun> owned = (root, query, builder) -> builder.and(
                builder.equal(root.get("createdBy").get("id"), author.get()),
                builder.equal(root.get("schemaBookmark").get("id"), bookmark.getId()));
        Sort newestFirst = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("id"));
        if (request.search().isEmpty()) {
            Page<PredictionRun> page = runRepository.findAll(owned, CatalogPages.pageable(request, newestFirst));
            return PageDto.of(page, dtos(page.getContent(), caller));
        }
        PageDto<Long> page = CatalogPages.page(catalogSearch.matchingIds(author.get(), bookmark.getId(),
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
        Principal author = run.getCreatedBy();
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
            PredictionResultFeedback feedback = feedbackRepository
                    .findByResultIdAndCreatedByIdAndTypeAndOrderAndReviewIsNull(result.getId(), author.getId(),
                            item.type(), route.order())
                    .orElseGet(() -> new PredictionResultFeedback(result, author, item.type(), route.order(), item.value()));
            feedback.setValue(item.value());
            history.save(feedback, author);
        }
        auditLog.record(actor(caller), run.getSchemaBookmark().getSchema().getOrganization().getId(),
                AuditAction.PUBLIC_FEEDBACK_SAVE, runId, AuditDetails.of("answers", request.items().size()));
        return dto(run, form, results, ownFeedback(List.of(runId), caller));
    }

    /** An account signed in acts as itself on a public page; only a browser alone is a visitor. */
    private static AuditActor actor(PublicCaller caller) {
        return caller.signedIn() ? AuditActor.user(caller.userId()) : AuditActor.VISITOR;
    }

    private PredictionRun ownRun(String publicId, Long runId, PublicCaller caller) {
        SchemaBookmark bookmark = publicBookmarks.requirePublic(publicId);
        return runRepository.findById(runId)
                .filter(run -> sessionAuthor(caller).filter(run.getCreatedBy().getId()::equals).isPresent())
                .filter(run -> run.getSchemaBookmark() != null && run.getSchemaBookmark().getId().equals(bookmark.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Run not found"));
    }

    private List<PredictionResultFeedback> ownFeedback(List<Long> runIds, PublicCaller caller) {
        return sessionAuthor(caller)
                .map(author -> feedbackRepository.findByResultRunIdInAndCreatedByIdAndReviewIsNullOrderByIdAsc(runIds, author))
                .orElse(List.of());
    }

    /** Whose public session this is: the signed-in account, or the visitor its cookie names; none for a new browser. */
    private Optional<Long> sessionAuthor(PublicCaller caller) {
        if (caller.signedIn()) return Optional.of(principals.user(caller.userId()).getId());
        return Optional.ofNullable(caller.visitorId()).flatMap(principalRepository::findByVisitorToken).map(Principal::getId);
    }

    private static PublicRunDto dto(PredictionRun run, PublicForm form, List<PredictionResult> results,
            List<PredictionResultFeedback> feedback) {
        return new PublicRunDto(run.getId(), run.getSchemaVersion().getVersion(), run.getCreatedAt(),
                PublicExampleInputs.of(run.getSchemaVersion().getFormSchema(), run.getInputData()),
                PublicRunReports.of(form.reportRoutes(), results),
                PublicRunReports.feedback(form.reportRoutes(), feedback));
    }

    private static String runName(OffsetDateTime now) {
        // Made from the bookmark's public page, by a visitor or a signed-in person alike.
        return "public-" + now.toInstant() + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
