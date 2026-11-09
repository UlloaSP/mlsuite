package dev.ulloasp.mlsuite.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;

import dev.ulloasp.mlsuite.admin.infrastructure.InfrastructureService;
import dev.ulloasp.mlsuite.admin.infrastructure.OpsAgentClient;
import dev.ulloasp.mlsuite.admin.infrastructure.ServiceActionRequest;
import dev.ulloasp.mlsuite.admin.infrastructure.TerminalSessions;
import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import jakarta.validation.Validation;
import jakarta.validation.Validator;

/** What the infrastructure endpoints accept before anything reaches the ops agent. */
class InfrastructureRequestsTest {

    private final OpsAgentClient agent = mock(OpsAgentClient.class);
    private final InfrastructureService service = new InfrastructureService(agent, mock(AuditLogService.class),
            mock(TerminalSessions.class));

    @Test
    void aServiceActionIsOneTheAgentKnows() {
        Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

        for (String action : new String[] { "START", "STOP", "RESTART" }) {
            assertTrue(validator.validate(new ServiceActionRequest(action)).isEmpty(), action);
        }
        assertEquals("must be START, STOP or RESTART",
                validator.validate(new ServiceActionRequest("PAUSE")).iterator().next().getMessage());
    }

    @Test
    void aLogTailIsBetweenOneAndFiveThousandLines() {
        service.logs("spring-app", 5000);
        verify(agent).logs("spring-app", 5000);

        for (int tail : new int[] { 0, -1, 5001 }) {
            assertThrows(IllegalArgumentException.class, () -> service.logs("spring-app", tail), String.valueOf(tail));
        }
        // Only the valid tail reached the agent.
        verify(agent).logs(anyString(), anyInt());
    }
}
