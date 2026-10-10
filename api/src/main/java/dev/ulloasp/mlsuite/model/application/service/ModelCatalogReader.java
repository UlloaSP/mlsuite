package dev.ulloasp.mlsuite.model.application.service;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.application.dto.ModelDto;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
final class ModelCatalogReader {

    private final ModelRepository modelRepository;
    private final WorkspaceAuthorizationService workspaceAuthorizationService;

    public List<Model> getModels(Long userId) {
        return modelRepository.findByOrganizationIdAndArchivedAtIsNull(requireModelView(userId));
    }

    public Optional<Model> findModel(Long userId, Long modelId) {
        return modelRepository.findByIdAndOrganizationIdAndArchivedAtIsNull(modelId, requireModelView(userId));
    }

    private Long requireModelView(Long userId) {
        return workspaceAuthorizationService.requireCurrent(userId, PermissionKey.VIEW_MODELS).getId();
    }

    public PageDto<ModelDto> getModelPage(Long userId, int page, int size, String search, String sort, String status) {
        Long organizationId = workspaceAuthorizationService.requireCurrent(userId, PermissionKey.VIEW_MODELS).getId();
        Page<Model> models = modelRepository.findCatalogPage(
                organizationId,
                normalizeSearch(search),
                "all".equals(status) || "archived".equals(status),
                "archived".equals(status),
                PageDto.request(page, size, sort(sort)));
        return PageDto.of(models, ModelDto.toDtoList(models.getContent()));
    }

    private String normalizeSearch(String search) {
        return search == null ? "" : search.strip();
    }

    private Sort sort(String mode) {
        Sort.Order byId = Sort.Order.asc("id");
        if ("name".equals(mode)) {
            return Sort.by(Sort.Order.asc("name").ignoreCase(), Sort.Order.desc("updatedAt"), byId);
        }
        if ("algorithm".equals(mode)) {
            return Sort.by(Sort.Order.asc("type").ignoreCase(), Sort.Order.asc("specificType").ignoreCase(), byId);
        }
        return Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.asc("name").ignoreCase(), byId);
    }

}
