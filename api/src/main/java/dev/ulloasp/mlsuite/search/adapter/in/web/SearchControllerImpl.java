package dev.ulloasp.mlsuite.search.adapter.in.web;

import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.search.application.dto.SearchResponseDto;
import dev.ulloasp.mlsuite.search.application.port.in.SearchWorkspaceUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;

@RestController
public class SearchControllerImpl implements SearchController {

    private final CurrentUserResolver currentUserResolver;
    private final SearchWorkspaceUseCase searchWorkspaceUseCase;

    public SearchControllerImpl(
            CurrentUserResolver currentUserResolver,
            SearchWorkspaceUseCase searchWorkspaceUseCase) {
        this.currentUserResolver = currentUserResolver;
        this.searchWorkspaceUseCase = searchWorkspaceUseCase;
    }

    @Override
    public ResponseEntity<SearchResponseDto> search(
            OAuth2AuthenticationToken authentication,
            String query) {
        return ResponseEntity.ok(searchWorkspaceUseCase.search(
                currentUserResolver.resolve(authentication).userId(),
                query));
    }
}
