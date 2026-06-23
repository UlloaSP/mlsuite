package dev.ulloasp.mlsuite.search;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import dev.ulloasp.mlsuite.search.adapter.in.web.SearchControllerImpl;
import dev.ulloasp.mlsuite.search.application.dto.SearchGroupDto;
import dev.ulloasp.mlsuite.search.application.dto.SearchResponseDto;
import dev.ulloasp.mlsuite.search.application.dto.SearchResultDto;
import dev.ulloasp.mlsuite.search.application.port.in.SearchWorkspaceUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;

@ExtendWith(MockitoExtension.class)
class SearchControllerTest {

    @Mock
    private CurrentUserResolver currentUserResolver;

    @Mock
    private SearchWorkspaceUseCase searchWorkspaceUseCase;

    @Mock
    private Authentication authentication;

    private SearchControllerImpl controller;

    @BeforeEach
    void setUp() {
        controller = new SearchControllerImpl(currentUserResolver, searchWorkspaceUseCase);
    }

    @Test
    void search_UsesInternalUserId() {
        SearchResponseDto response = new SearchResponseDto(
                "ac",
                List.of(new SearchGroupDto("Organizations", List.of(new SearchResultDto(
                        "organization",
                        "41",
                        "Acme",
                        "acme",
                        "/workspace/organizations/41",
                        41L,
                        null,
                        null)))));
        when(currentUserResolver.resolve(authentication)).thenReturn(new CurrentUser(7L, "alice", dev.ulloasp.mlsuite.user.domain.model.SystemRole.USER));
        when(searchWorkspaceUseCase.search(7L, "ac")).thenReturn(response);

        ResponseEntity<SearchResponseDto> entity = controller.search(authentication, "ac");

        assertEquals(HttpStatus.OK, entity.getStatusCode());
        assertEquals("ac", entity.getBody().query());
        verify(searchWorkspaceUseCase).search(7L, "ac");
    }
}
