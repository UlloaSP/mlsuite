package dev.ulloasp.mlsuite.schema.catalog;

import java.util.List;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/catalog-selection")
@RequiredArgsConstructor
public class CatalogSelectionController {

    private final CatalogSelectionService selection;

    @PostMapping
    public CatalogSelectionPageDto page(CurrentUser user, @RequestBody CatalogSelectionRequest request) {
        return selection.page(user.userId(), request);
    }

    @PostMapping("/ids")
    public List<String> ids(CurrentUser user, @RequestBody CatalogSelectionRequest request) {
        return selection.ids(user.userId(), request);
    }
}
