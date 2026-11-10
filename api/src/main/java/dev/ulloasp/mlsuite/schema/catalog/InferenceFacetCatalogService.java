package dev.ulloasp.mlsuite.schema.catalog;

import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogMetadataDto.Option;
import dev.ulloasp.mlsuite.util.CatalogPages;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.CatalogValues;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import lombok.RequiredArgsConstructor;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class InferenceFacetCatalogService {
    private final WorkspaceAuthorizationService authorization;
    private final InferenceCatalogQueries queries;
    private final InferenceCatalogService catalogs;

    public PageDto<Option> page(Long userId, InferenceFacetRequest request) {
        Long org = authorization.requireCurrent(userId, PermissionKey.VIEW_MODELS).getId();
        var controls = new CatalogRequest(request.page(), request.size(), request.search(), null, null);
        if ("schemas".equals(request.kind())) {
            return queries.optionPage(org, InferenceCatalogScope.organization(), false, controls);
        }
        if ("bookmarks".equals(request.kind())) {
            return queries.optionPage(org, InferenceCatalogScope.bookmarks(request.scope()), true, controls);
        }
        List<Option> options = switch (String.valueOf(request.kind())) {
            case "columns" -> catalogs.metadata(userId, request.scope()).columns().stream()
                    .map(column -> new Option(column.id(), column.label() + " · " + column.schemaName()))
                    .toList();
            default -> throw CatalogValues.unknown("kind", request.kind(), List.of("schemas", "bookmarks", "columns"));
        };
        var text = InferenceCatalogText.of(request.scope().locale());
        return CatalogPages.of(options, controls, option -> CatalogPages.contains(request.search(), option.label()),
                Comparator.comparing(Option::label, text.optionOrder()).thenComparing(Option::value));
    }
}
