package dev.ulloasp.mlsuite.apiaccess.application.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository.ApiClientKeyRepository;
import dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository.ApiClientRepository;
import dev.ulloasp.mlsuite.apiaccess.domain.exception.ApiErrorCode;
import dev.ulloasp.mlsuite.apiaccess.domain.exception.ApiProblem;
import dev.ulloasp.mlsuite.apiaccess.domain.model.ApiCaller;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.application.service.BookmarkPublishability;
import dev.ulloasp.mlsuite.schema.application.service.PublicBookmarkService;
import dev.ulloasp.mlsuite.schema.application.service.PublicForm;
import dev.ulloasp.mlsuite.schema.application.service.PublicRunReports;
import dev.ulloasp.mlsuite.schema.domain.model.BoundModel;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResult;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultStatus;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunOrigin;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunStatus;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import lombok.RequiredArgsConstructor;

/**
 * The database side of a call, each step in a short transaction of its own so no connection is
 * held while the runtime works: who calls, what they may run, and the run kept once the runtime
 * answered. The run has the shape of a public run, so the organization reviews, filters and
 * exports it with the rest; its author is the client's name.
 */
@Service
@Transactional
@RequiredArgsConstructor
public class ApiRunService {

    private static final Logger log = LoggerFactory.getLogger(ApiRunService.class);
    private static final int MAX_KEY_ECHO = 40;

    private final ApiClientKeyRepository keyRepository;
    private final ApiClientRepository clientRepository;
    private final SchemaBookmarkRepository bookmarkRepository;
    private final PredictionRunRepository runRepository;
    private final PredictionResultRepository resultRepository;
    private final ModelRepository modelRepository;
    private final BookmarkPublishability publishability;

    /** The key's holder; a missing key is answered like a wrong one. */
    @Transactional(readOnly = true)
    public ApiCaller authenticate(String secret) {
        return Optional.ofNullable(secret).filter(given -> !given.isEmpty())
                .flatMap(given -> keyRepository.findByKeyHash(ApiKeySecrets.hash(given)))
                .map(ApiCaller::of)
                .orElseThrow(() -> new ApiProblem(ApiErrorCode.INVALID_KEY,
                        "The X-MLSuite-Key header is missing, or names no key."));
    }

    /** A bookmark the client was not given is not found, whether or not it exists. */
    @Transactional(readOnly = true)
    public ApiTarget target(ApiCaller caller, String apiId) {
        return clientRepository.findGrantedBookmark(caller.clientId(), apiId)
                .map(bookmark -> new ApiTarget(bookmark.getId(), bookmark.getPublicId(), bookmark.getName()))
                .orElseThrow(() -> new ApiProblem(ApiErrorCode.BOOKMARK_NOT_FOUND,
                        "This client was not given a bookmark with this id."));
    }

    /** What the call runs: the bookmark's one model, if it can run, and the record if it is scalar. */
    @Transactional(readOnly = true)
    public ApiRunPlan plan(ApiCaller caller, ApiTarget target, Map<String, Object> features) {
        SchemaBookmark bookmark = bookmarkRepository.findById(target.bookmarkId())
                .orElseThrow(() -> new ApiProblem(ApiErrorCode.BOOKMARK_NOT_FOUND,
                        "This client was not given a bookmark with this id."));
        SchemaVersion version = bookmark.getVersion();
        List<BoundModel> models = publishability.models(version);
        if (models.size() != 1) {
            throw new ApiProblem(ApiErrorCode.BOOKMARK_NOT_RUNNABLE,
                    "Clients run a bookmark of exactly one model; this bookmark runs %d.".formatted(models.size()));
        }
        publishability.refusal(models).ifPresent(reason -> {
            log.warn("API client {} was not run: {}", caller.clientId(), reason);
            throw new ApiProblem(ApiErrorCode.BOOKMARK_NOT_RUNNABLE,
                    "This bookmark's model is too large to run for clients.");
        });
        features.forEach((name, value) -> {
            if (!PublicBookmarkService.isFormValue(value)) {
                throw new ApiProblem(ApiErrorCode.INVALID_FEATURES,
                        "Feature \"%s\" must be a number, a boolean, a text of at most 256 characters, or null."
                                .formatted(name.length() <= MAX_KEY_ECHO ? name : name.substring(0, MAX_KEY_ECHO)));
            }
        });
        BoundModel model = models.get(0);
        return new ApiRunPlan(caller, target, version.getId(), version.getVersion(), version.getName(), model.id(),
                model.name(), modelRepository.findArtifactSha256(model.id()).orElseThrow(),
                PublicForm.of(version.getFormSchema(), models).reportRoutes(), features);
    }

    /** Keeps a run the runtime answered, {@code answer} being its reply; returns the run's id. */
    public Long record(ApiRunPlan plan, Map<String, Object> answer) {
        SchemaBookmark bookmark = bookmarkRepository.findById(plan.target().bookmarkId())
                .filter(found -> found.getVersion().getId().equals(plan.versionId()))
                .orElseThrow(() -> new ApiProblem(ApiErrorCode.BOOKMARK_CHANGED,
                        "This bookmark changed while it ran. Run it again."));
        OffsetDateTime now = OffsetDateTime.now();
        PredictionRun run = new PredictionRun(bookmark, bookmark.getVersion(), runName(now), plan.features(),
                PredictionRunStatus.SUCCESS);
        run.setOrigin(PredictionRunOrigin.API);
        run.setCreatedByName(plan.caller().clientName());
        run = runRepository.save(run);
        resultRepository.save(new PredictionResult(run, modelRepository.getReferenceById(plan.modelId()),
                plan.features(), PublicRunReports.storedOutput(plan.modelId(), plan.features(), answer, plan.reports()),
                PredictionResultStatus.SUCCESS, null, null));
        // A key revoked while its run was in the runtime has nothing left to mark; the run stands
        // under the name its client had when the call was accepted.
        keyRepository.markUsed(plan.caller().keyId(), now);
        return run.getId();
    }

    private static String runName(OffsetDateTime now) {
        return "api-" + now.toInstant() + "-" + UUID.randomUUID().toString().substring(0, 8);
    }
}
