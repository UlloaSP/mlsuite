package dev.ulloasp.mlsuite.organization.application.usecase;

import dev.ulloasp.mlsuite.principal.application.service.Principals;
import dev.ulloasp.mlsuite.principal.domain.model.Principal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationLogoRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationDto;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationNotFoundException;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationLogo;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.util.SquareImage;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;

/**
 * The organization's logo: replaced or removed by whoever may edit the organization, read by
 * anyone, since it is shown on public pages beside the organization's name.
 */
@Service
@Transactional
@RequiredArgsConstructor
public class OrganizationLogoService {

    private final WorkspaceAccessService workspaceAccessService;
    private final WorkspaceAuthorizationService workspaceAuthorizationService;
    private final OrganizationRepository organizationRepository;
    private final OrganizationLogoRepository logoRepository;
    private final AuditLogService auditLog;
    private final EntityManager entityManager;
    private final Principals principals;

    public OrganizationDto replace(Long userId, Long organizationId, MultipartFile upload) {
        workspaceAuthorizationService.require(userId, organizationId, PermissionKey.EDIT_ORGANIZATION);
        Organization organization = requireOrganization(organizationId);
        SquareImage.Normalized logo = SquareImage.normalize(upload, "logo");
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        Principal author = principals.user(userId);
        logoRepository.findByOrganizationId(organizationId).ifPresentOrElse(
                stored -> stored.replace(logo.content(), logo.contentType(), now, author),
                () -> logoRepository.save(new OrganizationLogo(organizationId, logo.content(), logo.contentType(), now, author)));
        organization.setUpdatedBy(author);
        auditLog.record(AuditActor.user(userId), organizationId, AuditAction.ORGANIZATION_LOGO_REPLACE, organizationId);
        return OrganizationDto.from(reread(organization));
    }

    public OrganizationDto remove(Long userId, Long organizationId) {
        workspaceAuthorizationService.require(userId, organizationId, PermissionKey.EDIT_ORGANIZATION);
        Organization organization = requireOrganization(organizationId);
        logoRepository.deleteByOrganizationId(organizationId);
        organization.setUpdatedBy(principals.user(userId));
        auditLog.record(AuditActor.user(userId), organizationId, AuditAction.ORGANIZATION_LOGO_REMOVE, organizationId);
        return OrganizationDto.from(reread(organization));
    }

    @Transactional(readOnly = true)
    public Optional<OrganizationLogo> read(Long organizationId) {
        return logoRepository.findByOrganizationId(organizationId);
    }

    /** The logo's time is read from the logo row, so the organization is read again once it is written. */
    private Organization reread(Organization organization) {
        entityManager.flush();
        entityManager.refresh(organization);
        return organization;
    }

    private Organization requireOrganization(Long organizationId) {
        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new OrganizationNotFoundException(organizationId));
        organization.requireTeam("A personal account is pictured by its owner, not by a logo.");
        return organization;
    }
}
