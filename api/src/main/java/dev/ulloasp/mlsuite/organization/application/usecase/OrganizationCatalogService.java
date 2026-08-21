package dev.ulloasp.mlsuite.organization.application.usecase;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationCatalogItemDto;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationPageDto;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.plugin.adapter.out.persistence.repository.PluginMetadataRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;

@Service
@Transactional
public class OrganizationCatalogService {

    private final WorkspaceAccessService workspaceAccessService;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final ModelRepository modelRepository;
    private final SchemaRepository schemaRepository;
    private final PluginMetadataRepository pluginRepository;
    private final PredictionRunRepository predictionRunRepository;

    public OrganizationCatalogService(
            WorkspaceAccessService workspaceAccessService,
            OrganizationRepository organizationRepository,
            OrganizationMembershipRepository membershipRepository,
            ModelRepository modelRepository,
            SchemaRepository schemaRepository,
            PluginMetadataRepository pluginRepository,
            PredictionRunRepository predictionRunRepository) {
        this.workspaceAccessService = workspaceAccessService;
        this.organizationRepository = organizationRepository;
        this.membershipRepository = membershipRepository;
        this.modelRepository = modelRepository;
        this.schemaRepository = schemaRepository;
        this.pluginRepository = pluginRepository;
        this.predictionRunRepository = predictionRunRepository;
    }

    @Transactional(readOnly = true)
    public OrganizationPageDto getPage(Long userId, int page, int size, String search, String sort) {
        requireSuperadmin(userId);
        var organizations = organizationRepository.findCatalogPage(
                normalizeSearch(search),
                PageRequest.of(Math.max(page, 0), normalizePageSize(size), sort(sort)));
        return new OrganizationPageDto(
                organizations.getContent().stream().map(this::catalogItem).toList(),
                organizations.getNumber(),
                organizations.getSize(),
                organizations.getTotalElements(),
                organizations.hasNext());
    }

    private OrganizationCatalogItemDto catalogItem(Organization organization) {
        Long id = organization.getId();
        OrganizationMembership owner = membershipRepository
                .findActiveByOrganizationIdOrderByCreatedAtAsc(id)
                .stream()
                .filter(this::isOwner)
                .findFirst()
                .orElse(null);
        return OrganizationCatalogItemDto.from(
                organization,
                owner != null ? owner.getUser().getFullName() : null,
                owner != null ? owner.getUser().getEmail() : null,
                owner != null ? owner.getUser().getAvatarUrl() : null,
                modelRepository.countByOrganizationId(id),
                schemaRepository.countByOrganizationId(id),
                pluginRepository.countByOrganizationId(id),
                predictionRunRepository.countByOrganizationId(id),
                membershipRepository.countActiveByOrganizationId(id));
    }

    private void requireSuperadmin(Long userId) {
        if (!workspaceAccessService.isSuperadmin(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Superadmin access required.");
        }
    }

    private boolean isOwner(OrganizationMembership membership) {
        return membership.getRole() == OrganizationRole.OWNER
                || "OWNER".equals(membership.getRoleDefinition() != null
                        ? membership.getRoleDefinition().getSystemKey()
                        : null);
    }

    private String normalizeSearch(String search) {
        return search == null ? "" : search.strip();
    }

    private int normalizePageSize(int size) {
        return size <= 0 ? 24 : Math.min(size, 100);
    }

    private Sort sort(String mode) {
        if ("name".equals(mode)) return Sort.by(Sort.Order.asc("name").ignoreCase());
        if ("created".equals(mode)) return Sort.by(Sort.Order.desc("createdAt"));
        return Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.asc("name").ignoreCase());
    }
}
