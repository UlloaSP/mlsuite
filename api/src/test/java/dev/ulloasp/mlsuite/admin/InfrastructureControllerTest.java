package dev.ulloasp.mlsuite.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.admin.infrastructure.InfrastructureController;
import dev.ulloasp.mlsuite.admin.infrastructure.InfrastructureService;
import dev.ulloasp.mlsuite.admin.infrastructure.ServiceActionRequest;
import dev.ulloasp.mlsuite.admin.infrastructure.TerminalSessionRequest;
import dev.ulloasp.mlsuite.admin.infrastructure.TerminalSessionResponse;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;

@ExtendWith(MockitoExtension.class)
class InfrastructureControllerTest {

    private static final CurrentUser ROOT = new CurrentUser(1L, "root", SystemRole.SUPERADMIN);

    @Mock
    private InfrastructureService infrastructureService;

    private InfrastructureController controller;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        controller = new InfrastructureController(infrastructureService);
        objectMapper = new ObjectMapper();
    }

    @Test
    void overview_ReturnsProxyPayload() throws Exception {
        when(infrastructureService.overview()).thenReturn(objectMapper.readTree("{\"services\":[]}"));

        var response = controller.overview();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(0, response.getBody().path("services").size());
    }

    @Test
    void action_DelegatesToService() {
        var response = controller.action(ROOT, "spring-app", new ServiceActionRequest("RESTART"));

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(infrastructureService).action(1L, "spring-app", new ServiceActionRequest("RESTART"));
    }

    @Test
    void logs_ReturnsProxySnapshot() throws Exception {
        when(infrastructureService.logs("spring-app", 50))
                .thenReturn(objectMapper.readTree("{\"serviceName\":\"spring-app\",\"lines\":[\"one\"]}"));

        var response = controller.logs("spring-app", 50);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("one", response.getBody().path("lines").get(0).asText());
    }

    @Test
    void createTerminalSession_RewritesPublicPath() {
        when(infrastructureService.createTerminalSession(1L, new TerminalSessionRequest("spring-app", 120, 40)))
                .thenReturn(new TerminalSessionResponse("abc", "/api/admin/infrastructure/terminal/abc"));

        var response = controller.createTerminalSession(ROOT, new TerminalSessionRequest("spring-app", 120, 40));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("/api/admin/infrastructure/terminal/abc", response.getBody().wsPath());
    }

    @Test
    void closeTerminalSession_DelegatesToService() {
        var response = controller.closeTerminalSession(ROOT, "abc");

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(infrastructureService).closeTerminalSession(1L, "abc");
    }
}
