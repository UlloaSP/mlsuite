package dev.ulloasp.mlsuite.model.application.service;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.application.dto.ModelDto;
import dev.ulloasp.mlsuite.model.application.dto.ModelPageDto;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

final class ModelCatalogReader {
    private final ModelRepository modelRepository;
    private final WorkspaceAccessService workspaceAccessService;
    private final WorkspaceAuthorizationService workspaceAuthorizationService;

    ModelCatalogReader(ModelRepository modelRepository, WorkspaceAccessService workspaceAccessService,
            WorkspaceAuthorizationService workspaceAuthorizationService) {
        this.modelRepository = modelRepository;
        this.workspaceAccessService = workspaceAccessService;
        this.workspaceAuthorizationService = workspaceAuthorizationService;
    }

    public List<Model> getModels(Long userId) {
        Long organizationId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        workspaceAuthorizationService.requireModelView(userId, organizationId);
        return modelRepository.findByOrganizationIdAndArchivedAtIsNull(organizationId);
    }

    public ModelPageDto getModelPage(Long userId, int page, int size, String search, String sort, String status) {
        Long organizationId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        workspaceAuthorizationService.requireModelView(userId, organizationId);
        Page<Model> models = modelRepository.findCatalogPage(
                organizationId,
                normalizeSearch(search),
                "all".equals(status) || "archived".equals(status),
                "archived".equals(status),
                PageRequest.of(Math.max(page, 0), normalizePageSize(size), sort(sort)));
        return new ModelPageDto(
                ModelDto.toDtoList(models.getContent()),
                models.getNumber(),
                models.getSize(),
                models.getTotalElements(),
                models.hasNext());
    }

    private String normalizeSearch(String search) {
        return search == null ? "" : search.strip();
    }

    private int normalizePageSize(int size) {
        if (size <= 0) {
            return 24;
        }
        return Math.min(size, 100);
    }

    private Sort sort(String mode) {
        if ("name".equals(mode)) {
            return Sort.by(Sort.Order.asc("name").ignoreCase(), Sort.Order.desc("updatedAt"));
        }
        if ("algorithm".equals(mode)) {
            return Sort.by(Sort.Order.asc("type").ignoreCase(), Sort.Order.asc("specificType").ignoreCase());
        }
        return Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.asc("name").ignoreCase());
    }

}
