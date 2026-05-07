package dev.ulloasp.mlsuite.admin.infrastructure;

import java.io.IOException;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.WebSocket;
import okhttp3.WebSocketListener;

@Service
public class OpsAgentClient {

    private static final MediaType JSON = MediaType.parse("application/json");

    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final OpsAgentProperties properties;

    public OpsAgentClient(ObjectMapper objectMapper, OpsAgentProperties properties) {
        this.objectMapper = objectMapper;
        this.properties = properties;
        this.httpClient = new OkHttpClient();
    }

    public JsonNode overview() {
        return readJson(buildRequest("/internal/overview").get().build());
    }

    public void action(String serviceName, String action) {
        JsonNode payload = objectMapper.createObjectNode().put("action", action);
        RequestBody body = RequestBody.create(payload.toString(), JSON);
        Request request = buildRequest("/internal/services/" + serviceName + "/actions").post(body).build();
        executeVoid(request);
    }

    public JsonNode logs(String serviceName, int tail) {
        return readJson(buildRequest("/internal/services/" + serviceName + "/logs?tail=" + tail).get().build());
    }

    public TerminalSessionResponse createTerminalSession(TerminalSessionRequest request) {
        try {
            RequestBody body = RequestBody.create(objectMapper.writeValueAsString(request), JSON);
            JsonNode response = readJson(buildRequest("/internal/terminal/sessions").post(body).build());
            return new TerminalSessionResponse(
                    response.path("sessionId").asText(),
                    response.path("wsPath").asText());
        } catch (IOException ex) {
            throw new OpsAgentException(502, "Cannot encode terminal session request.");
        }
    }

    public void closeTerminalSession(String sessionId) {
        executeVoid(buildRequest("/internal/terminal/sessions/" + sessionId).delete().build());
    }

    public WebSocket connectWebSocket(String path, WebSocketListener listener) {
        Request request = buildRequest(path)
                .url(toWebSocketUrl(path))
                .build();
        return httpClient.newWebSocket(request, listener);
    }

    private JsonNode readJson(Request request) {
        try (Response response = httpClient.newCall(request).execute()) {
            String body = response.body() != null ? response.body().string() : "";
            if (!response.isSuccessful()) {
                throw new OpsAgentException(response.code(), extractMessage(body));
            }
            return objectMapper.readTree(body);
        } catch (IOException ex) {
            throw new OpsAgentException(502, "Ops agent unavailable.");
        }
    }

    private void executeVoid(Request request) {
        try (Response response = httpClient.newCall(request).execute()) {
            String body = response.body() != null ? response.body().string() : "";
            if (!response.isSuccessful()) {
                throw new OpsAgentException(response.code(), extractMessage(body));
            }
        } catch (IOException ex) {
            throw new OpsAgentException(502, "Ops agent unavailable.");
        }
    }

    private Request.Builder buildRequest(String path) {
        return new Request.Builder()
                .url(properties.baseUrl() + path)
                .header("X-MLSuite-Ops-Secret", properties.sharedSecret());
    }

    private String toWebSocketUrl(String path) {
        String base = properties.baseUrl()
                .replaceFirst("^http://", "ws://")
                .replaceFirst("^https://", "wss://");
        return base + path;
    }

    private String extractMessage(String body) {
        try {
            return objectMapper.readTree(body).path("detail").asText("Ops agent error.");
        } catch (IOException ex) {
            return body == null || body.isBlank() ? "Ops agent error." : body;
        }
    }
}
