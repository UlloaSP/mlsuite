package dev.ulloasp.mlsuite.admin.infrastructure;

import org.springframework.stereotype.Service;

import tools.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;

@Service
@RequiredArgsConstructor
public class InfrastructureService {

    private final OpsAgentClient opsAgentClient;
    private final AuditLogService auditLog;
    private final TerminalSessions terminals;

    private static final int MAX_TAIL = 5000;

    public JsonNode overview() {
        return opsAgentClient.overview();
    }

    public void action(Long actorId, String serviceName, ServiceActionRequest request) {
        opsAgentClient.action(serviceName, request.action());
        auditLog.record(AuditActor.user(actorId), null, AuditAction.INFRASTRUCTURE_SERVICE_ACTION, serviceName,
                AuditDetails.of("action", request.action()));
    }

    public JsonNode logs(String serviceName, int tail) {
        if (tail < 1 || tail > MAX_TAIL) {
            throw new IllegalArgumentException("tail must be between 1 and " + MAX_TAIL + " lines.");
        }
        return opsAgentClient.logs(serviceName, tail);
    }

    public TerminalSessionResponse createTerminalSession(Long actorId, TerminalSessionRequest request) {
        return terminals.open(actorId, request);
    }

    public void closeTerminalSession(Long actorId, String sessionId) {
        terminals.end(AuditActor.user(actorId), sessionId, "closed");
    }
}
