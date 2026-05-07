package dev.ulloasp.mlsuite.admin.infrastructure;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;

@Service
public class InfrastructureService {

    private final OpsAgentClient opsAgentClient;

    public InfrastructureService(OpsAgentClient opsAgentClient) {
        this.opsAgentClient = opsAgentClient;
    }

    public JsonNode overview() {
        return opsAgentClient.overview();
    }

    public void action(String serviceName, ServiceActionRequest request) {
        opsAgentClient.action(serviceName, request.action());
    }

    public JsonNode logs(String serviceName, int tail) {
        return opsAgentClient.logs(serviceName, tail);
    }

    public TerminalSessionResponse createTerminalSession(TerminalSessionRequest request) {
        TerminalSessionResponse upstream = opsAgentClient.createTerminalSession(request);
        return new TerminalSessionResponse(upstream.sessionId(), "/api/admin/infrastructure/terminal/" + upstream.sessionId());
    }

    public void closeTerminalSession(String sessionId) {
        opsAgentClient.closeTerminalSession(sessionId);
    }
}
