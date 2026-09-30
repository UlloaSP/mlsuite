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

import dev.ulloasp.mlsuite.search.adapter.in.web.SearchController;
import dev.ulloasp.mlsuite.search.application.dto.SearchGroupDto;
import dev.ulloasp.mlsuite.search.application.dto.SearchResponseDto;
import dev.ulloasp.mlsuite.search.application.dto.SearchResultDto;
import dev.ulloasp.mlsuite.search.application.port.in.SearchWorkspaceUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;

@ExtendWith(MockitoExtension.class)
class SearchControllerTest {

    @Mock
    private SearchWorkspaceUseCase searchWorkspaceUseCase;
    private CurrentUser user;

    private SearchController controller;

    @BeforeEach
    void setUp() {
        controller = new SearchController(searchWorkspaceUseCase);
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
                        null)))));
        user = new CurrentUser(7L, "alice", dev.ulloasp.mlsuite.user.domain.model.SystemRole.USER);
        when(searchWorkspaceUseCase.search(7L, "ac")).thenReturn(response);

        ResponseEntity<SearchResponseDto> entity = controller.search(user, "ac");

        assertEquals(HttpStatus.OK, entity.getStatusCode());
        assertEquals("ac", entity.getBody().query());
        verify(searchWorkspaceUseCase).search(7L, "ac");
    }
}
