package dev.ulloasp.mlsuite.workspace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.workspace.adapter.in.web.WorkspaceController;
import dev.ulloasp.mlsuite.workspace.application.dto.WorkspaceContextDto;
import dev.ulloasp.mlsuite.workspace.application.port.in.WorkspaceContextUseCase;

@ExtendWith(MockitoExtension.class)
class WorkspaceControllerTest {

    @Mock
    private WorkspaceContextUseCase workspaceContextUseCase;
    private CurrentUser user;

    private WorkspaceController controller;

    @BeforeEach
    void setUp() {
        controller = new WorkspaceController(workspaceContextUseCase);
    }

    @Test
    void getContext_OmitsOrganizationInvitations() {
        WorkspaceContextDto context = new WorkspaceContextDto(
                null,
                List.of(),
                List.of(),
                null,
                null,
                null);
        user = new CurrentUser(7L, "alice", SystemRole.USER);
        when(workspaceContextUseCase.getContext(7L)).thenReturn(context);

        var response = controller.getContext(user);
        var json = new ObjectMapper().valueToTree(response.getBody());

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertFalse(json.has("invitations"));
        verify(workspaceContextUseCase).getContext(7L);
    }
}
