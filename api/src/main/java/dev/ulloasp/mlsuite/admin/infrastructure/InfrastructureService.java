package dev.ulloasp.mlsuite.admin.infrastructure;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
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

    public JsonNode overview() {
        return opsAgentClient.overview();
    }

    public void action(Long actorId, String serviceName, ServiceActionRequest request) {
        opsAgentClient.action(serviceName, request.action());
        auditLog.record(AuditActor.user(actorId), null, AuditAction.INFRASTRUCTURE_SERVICE_ACTION, serviceName,
                AuditDetails.of("action", request.action()));
    }

    public JsonNode logs(String serviceName, int tail) {
        return opsAgentClient.logs(serviceName, tail);
    }

    public TerminalSessionResponse createTerminalSession(Long actorId, TerminalSessionRequest request) {
        TerminalSessionResponse upstream = opsAgentClient.createTerminalSession(request);
        auditLog.record(AuditActor.user(actorId), null, AuditAction.TERMINAL_SESSION_OPEN, upstream.sessionId(),
                AuditDetails.of("service", request.serviceName()));
        return new TerminalSessionResponse(upstream.sessionId(), "/api/admin/infrastructure/terminal/" + upstream.sessionId());
    }

    public void closeTerminalSession(Long actorId, String sessionId) {
        opsAgentClient.closeTerminalSession(sessionId);
        auditLog.record(AuditActor.user(actorId), null, AuditAction.TERMINAL_SESSION_CLOSE, sessionId);
    }
}
