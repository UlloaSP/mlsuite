package dev.ulloasp.mlsuite.schema.application.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.BookmarkApiKeyRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.domain.model.BookmarkApiKey;
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
 * The database side of a run made with an API key: what the key may run, read before the
 * runtime is called, and the run kept once it answered, each in a short transaction of its own.
 * The run has the shape of a public run, so the organization reviews, filters and exports it
 * with the rest; its author is the key's name.
 */
@Service
@Transactional
@RequiredArgsConstructor
public class ConsumerRunService {

    private static final Logger log = LoggerFactory.getLogger(ConsumerRunService.class);
    private static final int MAX_KEY_ECHO = 40;

    private final BookmarkApiKeyRepository keyRepository;
    private final SchemaBookmarkRepository bookmarkRepository;
    private final PredictionRunRepository runRepository;
    private final PredictionResultRepository resultRepository;
    private final ModelRepository modelRepository;
    private final BookmarkPublishability publishability;

    /**
     * The key, then its bookmark, then the record: a caller without a valid key learns nothing
     * about the bookmark. A bookmark that is not public now is not found, as on its public page.
     */
    @Transactional(readOnly = true)
    public ConsumerPredictionPlan plan(String secret, Map<String, Object> features) {
        BookmarkApiKey key = Optional.ofNullable(secret).filter(given -> !given.isEmpty())
                .flatMap(given -> keyRepository.findByKeyHash(ApiKeySecrets.hash(given)))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid API key."));
        SchemaBookmark bookmark = bookmarkRepository.findPublishedById(key.getBookmark().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Public bookmark not found"));
        SchemaVersion version = bookmark.getVersion();
        List<BoundModel> models = publishability.models(version);
        if (models.size() != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "An API key runs a bookmark of exactly one model; this bookmark runs %d.".formatted(models.size()));
        }
        publishability.refusal(models).ifPresent(reason -> {
            log.warn("API key {} was not run: {}", key.getId(), reason);
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This bookmark cannot be run publicly.");
        });
        features.forEach((name, value) -> {
            if (!PublicBookmarkService.isFormValue(value)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Feature \"%s\" must be a number, a boolean, a text of at most 256 characters, or null."
                                .formatted(name.length() <= MAX_KEY_ECHO ? name : name.substring(0, MAX_KEY_ECHO)));
            }
        });
        return new ConsumerPredictionPlan(key.getId(), key.getName(), bookmark.getId(), version.getId(),
                models.get(0).id(), PublicForm.of(version.getFormSchema(), models).reportRoutes(), features);
    }

    /** Keeps a run the runtime answered; {@code answer} is the runtime's reply. */
    public void record(ConsumerPredictionPlan plan, Map<String, Object> answer) {
        SchemaBookmark bookmark = bookmarkRepository.findById(plan.bookmarkId())
                .filter(found -> found.getVersion().getId().equals(plan.versionId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                        "This bookmark changed while it ran. Run it again."));
        OffsetDateTime now = OffsetDateTime.now();
        PredictionRun run = new PredictionRun(bookmark, bookmark.getVersion(), runName(now), plan.features(),
                PredictionRunStatus.SUCCESS);
        run.setOrigin(PredictionRunOrigin.API);
        run.setCreatedByName(plan.keyName());
        run = runRepository.save(run);
        resultRepository.save(new PredictionResult(run, modelRepository.getReferenceById(plan.modelId()),
                plan.features(), PublicRunReports.storedOutput(plan.modelId(), plan.features(), answer, plan.reports()),
                PredictionResultStatus.SUCCESS, null, null));
        // A key revoked while its run was in the runtime has nothing left to mark; the run stands
        // under the name the key had when the call was accepted.
        keyRepository.markUsed(plan.keyId(), now);
    }

    private static String runName(OffsetDateTime now) {
        return "api-" + now.toInstant() + "-" + UUID.randomUUID().toString().substring(0, 8);
    }
}
