package dev.ulloasp.mlsuite.model.application.runtime;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;

/** The way out of a failed preparation: a member who may edit models has it tried again. */
@Service
@RequiredArgsConstructor
public class ModelPreparationService {

    private final WorkspaceAuthorizationService authorization;
    private final ModelRepository models;
    private final ModelPreparationLedger ledger;
    private final EntityManager entityManager;
    private final AuditLogService auditLog;

    @Transactional
    public Model retry(Long userId, Long modelId) {
        Organization organization = authorization.requireCurrent(userId, PermissionKey.EDIT_MODELS);
        Model model = models.findByIdAndOrganizationId(modelId, organization.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Model not found"));
        if (!ledger.retry(model.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Only a model whose environment could not be prepared can be prepared again.");
        }
        auditLog.record(AuditActor.user(userId), organization.getId(), AuditAction.MODEL_ENVIRONMENT_RETRY, modelId,
                AuditDetails.of("name", model.getName()));
        // The ledger wrote the row directly; the managed entity reads it again.
        entityManager.refresh(model);
        return model;
    }
}
