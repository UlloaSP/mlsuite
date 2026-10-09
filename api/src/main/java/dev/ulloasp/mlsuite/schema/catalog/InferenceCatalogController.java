package dev.ulloasp.mlsuite.schema.catalog;

import java.util.List;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.schema.application.dto.PredictionRunCatalogItemDto;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.util.PageDto;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/prediction-runs/catalog")
@RequiredArgsConstructor
public class InferenceCatalogController {

    private final InferenceCatalogService catalog;
    private final InferenceFacetCatalogService facets;

    @PostMapping("/facets")
    public PageDto<InferenceCatalogMetadataDto.Option> inferenceFacetCatalog(CurrentUser user,
            @RequestBody InferenceFacetRequest request) {
        return facets.page(user.userId(), request);
    }

    @PostMapping
    public PageDto<InferenceCatalogRowDto> page(CurrentUser user, @RequestBody InferenceCatalogRequest request) {
        return catalog.page(user.userId(), request);
    }

    @PostMapping("/metadata")
    public InferenceCatalogMetadataDto metadata(CurrentUser user, @RequestBody InferenceCatalogRequest request) {
        return catalog.metadata(user.userId(), request);
    }

    @PostMapping("/selection")
    public List<PredictionRunCatalogItemDto> selection(CurrentUser user,
            @RequestBody InferenceCatalogRequest request) {
        return catalog.selection(user.userId(), request);
    }
}
