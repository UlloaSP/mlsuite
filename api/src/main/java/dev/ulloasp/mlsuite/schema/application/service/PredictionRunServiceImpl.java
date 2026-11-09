package dev.ulloasp.mlsuite.schema.application.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.application.dto.CreatePredictionRunRequest;
import dev.ulloasp.mlsuite.schema.application.port.in.PredictionRunUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@Transactional
@RequiredArgsConstructor
public class PredictionRunServiceImpl implements PredictionRunUseCase {

    private final UserLookupService userLookupService;
    private final SchemaBookmarkRepository bookmarkRepository;
    private final PredictionRunRepository runRepository;
    private final PredictionRunDeletion deletion;
    private final SnapshotRunGuard guard;
    private final WorkspaceAuthorizationService authorizationService;
    private final PredictionAttestations attestations;
    private final PredictionRunStore runStore;
    private final AuditLogService auditLog;

    @Override
    public PredictionRun createRunForBookmark(Long userId, Long schemaBookmarkId, CreatePredictionRunRequest request) {
        User user = userLookupService.requireById(userId);
        Long organizationId = requireRunPredictions(userId);
        SchemaBookmark bookmark = requireBookmark(schemaBookmarkId, organizationId);
        PredictionRun run = createRun(organizationId, user, bookmark, request);
        auditLog.record(AuditActor.user(userId), organizationId, AuditAction.PREDICTION_RUN_SAVE, run.getId(),
                AuditDetails.of("name", run.getName(), "bookmarkId", schemaBookmarkId, "status", run.getStatus()));
        return run;
    }

    @Override
    public List<Long> createRunsForBookmark(Long userId, Long schemaBookmarkId,
            List<CreatePredictionRunRequest> requests) {
        User user = userLookupService.requireById(userId);
        Long organizationId = requireRunPredictions(userId);
        SchemaBookmark bookmark = requireBookmark(schemaBookmarkId, organizationId);
        List<Long> runIds = requests.stream()
                .map(request -> createRun(organizationId, user, bookmark, request).getId()).toList();
        auditLog.record(AuditActor.user(userId), organizationId, AuditAction.PREDICTION_RUN_BATCH_CREATE,
                schemaBookmarkId, AuditDetails.of("runs", runIds.size()));
        return runIds;
    }

    @Override
    public PredictionRun getRun(Long userId, Long runId) {
        Long organizationId = requireRead(userId);
        return runRepository.findByIdAndOrganizationId(runId, organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Prediction run not found"));
    }

    @Override
    public void deleteRun(Long userId, Long runId) {
        Long organizationId = requireRunPredictions(userId);
        PredictionRun run = runRepository.findByIdAndOrganizationId(runId, organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Prediction run not found"));
        PredictionRunDeletion.Deleted deleted = deletion.delete(userId, List.of(runId));
        auditLog.record(AuditActor.user(userId), organizationId, AuditAction.PREDICTION_RUN_DELETE, runId,
                AuditDetails.of("name", run.getName(), "answers", deleted.answers(), "reviews", deleted.reviews()));
    }

    @Override
    public int deleteRuns(Long userId, List<Long> runIds) {
        Long organizationId = requireRunPredictions(userId);
        List<Long> distinct = runIds.stream().distinct().toList();
        if (runRepository.countByIdsAndOrganizationId(distinct, organizationId) != distinct.size()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Prediction run not found");
        }
        PredictionRunDeletion.Deleted deleted = deletion.delete(userId, distinct);
        auditLog.record(AuditActor.user(userId), organizationId, AuditAction.PREDICTION_RUN_BATCH_DELETE, organizationId,
                AuditDetails.of("runs", distinct.size(), "answers", deleted.answers(), "reviews", deleted.reviews()));
        return distinct.size();
    }

    private Long requireRead(Long userId) {
        return authorizationService.requireCurrent(userId, PermissionKey.VIEW_MODELS).getId();
    }

    private Long requireRunPredictions(Long userId) {
        return authorizationService.requireCurrent(userId, PermissionKey.RUN_PREDICTIONS).getId();
    }

    private SchemaBookmark requireBookmark(Long schemaBookmarkId, Long organizationId) {
        return bookmarkRepository.findByIdAndOrganizationId(schemaBookmarkId, organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema bookmark not found"));
    }

    /**
     * A run keeps only results the server produced: each one is opened from its seal and stored
     * exactly as sealed (PredictionRunStore).
     */
    private PredictionRun createRun(Long organizationId, User user, SchemaBookmark bookmark,
            CreatePredictionRunRequest request) {
        if (!bookmark.getVersion().getId().equals(request.schemaVersionId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "The bookmark moved to another snapshot; reload before saving");
        }
        guard.requireRunnable(bookmark.getVersion().getId());
        List<SealedPrediction.Opened> opened = request.results().stream()
                .map(result -> attestations.open(result.attestation()))
                .toList();
        Map<String, Object> formValues = opened.getFirst().sealed().inputData();
        // The run shows the form's values and, under their own names, what each model received.
        Map<String, Object> inputData = new LinkedHashMap<>(formValues);
        for (SealedPrediction.Opened seal : opened) {
            SealedPrediction sealed = seal.sealed();
            if (!user.getId().equals(sealed.userId()) || !bookmark.getId().equals(sealed.schemaBookmarkId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "A prediction result was run by someone else or through another bookmark");
            }
            if (!Objects.equals(formValues, sealed.inputData())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "The prediction results were run on different inputs; run the inference again");
            }
            inputData.putAll(sealed.prediction().modelInput());
        }
        return runStore.store(organizationId, user, bookmark, request.name(), inputData,
                opened.stream().map(seal -> seal.sealed().prediction()).toList(),
                opened.stream().map(SealedPrediction.Opened::sha256).toList());
    }
}
