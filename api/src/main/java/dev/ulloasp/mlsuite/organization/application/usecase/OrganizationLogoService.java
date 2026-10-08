package dev.ulloasp.mlsuite.organization.application.usecase;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationLogoRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationDto;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationNotFoundException;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationLogo;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
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

    public OrganizationDto replace(Long userId, Long organizationId, MultipartFile upload) {
        workspaceAuthorizationService.require(userId, organizationId, PermissionKey.EDIT_ORGANIZATION);
        Organization organization = requireOrganization(organizationId);
        if (upload == null || upload.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Upload a PNG or JPG image.");
        }
        if (upload.getSize() > OrganizationLogoImage.MAX_UPLOAD_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The logo must be at most 2 MB.");
        }
        OrganizationLogoImage.Normalized logo = OrganizationLogoImage.normalize(bytes(upload));
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        logoRepository.save(new OrganizationLogo(organizationId, logo.content(), logo.contentType(), now));
        organization.setLogoUpdatedAt(now);
        organization.setUpdatedBy(workspaceAccessService.requireUser(userId));
        return OrganizationDto.from(organizationRepository.save(organization));
    }

    public OrganizationDto remove(Long userId, Long organizationId) {
        workspaceAuthorizationService.require(userId, organizationId, PermissionKey.EDIT_ORGANIZATION);
        Organization organization = requireOrganization(organizationId);
        logoRepository.deleteById(organizationId);
        organization.setLogoUpdatedAt(null);
        organization.setUpdatedBy(workspaceAccessService.requireUser(userId));
        return OrganizationDto.from(organizationRepository.save(organization));
    }

    @Transactional(readOnly = true)
    public Optional<OrganizationLogo> read(Long organizationId) {
        return logoRepository.findById(organizationId);
    }

    private Organization requireOrganization(Long organizationId) {
        return organizationRepository.findById(organizationId)
                .orElseThrow(() -> new OrganizationNotFoundException(organizationId));
    }

    private static byte[] bytes(MultipartFile upload) {
        try {
            return upload.getBytes();
        } catch (IOException failure) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The image could not be read.");
        }
    }
}
