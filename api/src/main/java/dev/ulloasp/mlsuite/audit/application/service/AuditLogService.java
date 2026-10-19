package dev.ulloasp.mlsuite.audit.application.service;

import java.util.Locale;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.audit.adapter.out.persistence.repository.AuditEventRepository;
import dev.ulloasp.mlsuite.audit.application.dto.AuditEventDto;
import dev.ulloasp.mlsuite.audit.application.port.in.AuditLogUseCase;
import dev.ulloasp.mlsuite.audit.domain.model.AuditEvent;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.util.CatalogPages;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import lombok.RequiredArgsConstructor;

/**
 * Records what was done to an organization and pages it back to members who may read the log.
 * Platform actions on the organization's resources (moderation, client suspension, call limits)
 * are recorded in that organization's log under the superadmin who took them.
 */
@Service
@RequiredArgsConstructor
public class AuditLogService implements AuditLogUseCase {

    private final AuditEventRepository auditEventRepository;
    private final WorkspaceAuthorizationService authorizationService;

    @Transactional
    public void record(Organization organization, User actor, String action, String targetType, String targetId, String metadata) {
        auditEventRepository.save(new AuditEvent(organization, actor, action, targetType, targetId, metadata));
    }

    @Override
    @Transactional(readOnly = true)
    public PageDto<AuditEventDto> list(Long userId, Long organizationId, CatalogRequest request) {
        authorizationService.require(userId, organizationId, PermissionKey.VIEW_AUDIT_LOG);
        String action = "all".equalsIgnoreCase(request.filter()) ? "all" : request.filter().toUpperCase(Locale.ROOT);
        Page<AuditEvent> page = auditEventRepository.findCatalog(organizationId, action,
                CatalogPages.likeLiteral(request.search()), PageDto.request(request.page(), request.size(), Sort.unsorted()));
        return PageDto.of(page, page.getContent().stream().map(AuditEventDto::from).toList());
    }
}
