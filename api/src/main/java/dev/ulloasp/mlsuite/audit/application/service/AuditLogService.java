package dev.ulloasp.mlsuite.audit.application.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.audit.adapter.out.persistence.repository.AuditEventRepository;
import dev.ulloasp.mlsuite.audit.application.dto.AuditEventDto;
import dev.ulloasp.mlsuite.audit.application.port.in.AuditLogUseCase;
import dev.ulloasp.mlsuite.audit.domain.model.AuditEvent;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@Service
public class AuditLogService implements AuditLogUseCase {

    private final AuditEventRepository auditEventRepository;
    private final WorkspaceAccessService workspaceAccessService;
    private final WorkspaceAuthorizationService authorizationService;

    public AuditLogService(
            AuditEventRepository auditEventRepository,
            WorkspaceAccessService workspaceAccessService,
            WorkspaceAuthorizationService authorizationService) {
        this.auditEventRepository = auditEventRepository;
        this.workspaceAccessService = workspaceAccessService;
        this.authorizationService = authorizationService;
    }

    @Transactional
    public void record(Organization organization, User actor, String action, String targetType, String targetId, String metadata) {
        auditEventRepository.save(new AuditEvent(organization, actor, action, targetType, targetId, metadata));
    }

    @Override
    @Transactional(readOnly = true)
    public List<AuditEventDto> list(Long userId, Long organizationId) {
        authorizationService.requireOrganizationRead(userId, organizationId);
        workspaceAccessService.requireUser(userId);
        return auditEventRepository.findTop20ByOrganizationIdOrderByCreatedAtDesc(organizationId)
                .stream()
                .map(AuditEventDto::from)
                .toList();
    }
}
