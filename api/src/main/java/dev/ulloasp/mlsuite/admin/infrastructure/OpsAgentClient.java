package dev.ulloasp.mlsuite.admin.infrastructure;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.CompletableFuture;

import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Calls the ops agent with its shared secret. Every call and the WebSocket bridges share one JDK
 * client. A call answers within {@link #READ_TIMEOUT}, except a service action, which may take
 * {@link #ACTION_TIMEOUT}, and the quick looks the alerts and the terminal reaper take, which must
 * answer within {@link #QUICK_TIMEOUT}.
 */
@Service
public class OpsAgentClient {

    static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(10);
    static final Duration READ_TIMEOUT = Duration.ofSeconds(10);
    static final Duration ACTION_TIMEOUT = Duration.ofSeconds(60);
    static final Duration QUICK_TIMEOUT = Duration.ofSeconds(5);
    private static final String SECRET_HEADER = "X-MLSuite-Ops-Secret";

    private final HttpClient connections;
    private final RestClient calls;
    private final RestClient actions;
    private final RestClient quickCalls;
    private final ObjectMapper objectMapper;
    private final OpsAgentProperties properties;

    public OpsAgentClient(RestClient.Builder builder, ObjectMapper objectMapper, OpsAgentProperties properties) {
        this.objectMapper = objectMapper;
        this.properties = properties;
        // HTTP/1.1: the agent speaks nothing else, and the client would otherwise ask to upgrade.
        this.connections = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(CONNECT_TIMEOUT)
                .build();
        RestClient.Builder agent = builder.clone()
                .baseUrl(properties.baseUrl())
                .defaultHeader(SECRET_HEADER, properties.sharedSecret());
        this.calls = restClient(agent, READ_TIMEOUT);
        this.actions = restClient(agent, ACTION_TIMEOUT);
        this.quickCalls = restClient(agent, QUICK_TIMEOUT);
    }

    public JsonNode overview() {
        return readJson(calls.get().uri("/internal/overview"));
    }

    /** How much of the machine is in use. Fails when the agent cannot say, as when it cannot be reached. */
    public JsonNode load() {
        return readJson(quickCalls.get().uri("/internal/load"));
    }

    /** Whether the host's last local backup attempt failed or left no backup ({@code failing}, null when unknown). */
    public JsonNode backup() {
        return readJson(quickCalls.get().uri("/internal/backup"));
    }

    public void action(String serviceName, String action) {
        String payload = objectMapper.createObjectNode().put("action", action).toString();
        send(actions.post().uri("/internal/services/{service}/actions", serviceName)
                .contentType(MediaType.APPLICATION_JSON).body(payload));
    }

    public JsonNode logs(String serviceName, int tail) {
        return readJson(calls.get().uri("/internal/services/{service}/logs?tail={tail}", serviceName, tail));
    }

    public TerminalSessionResponse createTerminalSession(TerminalSessionRequest request) {
        String payload;
        try {
            payload = objectMapper.writeValueAsString(request);
        } catch (JacksonException ex) {
            throw new OpsAgentException(502, "Cannot encode terminal session request.");
        }
        JsonNode response = readJson(calls.post().uri("/internal/terminal/sessions")
                .contentType(MediaType.APPLICATION_JSON).body(payload));
        return new TerminalSessionResponse(
                response.path("sessionId").asString(),
                response.path("wsPath").asString());
    }

    /** The terminal sessions the agent has now, attached or not. */
    public Set<String> terminalSessionIds() {
        Set<String> ids = new HashSet<>();
        readJson(quickCalls.get().uri("/internal/terminal/sessions"))
                .path("sessionIds").forEach(id -> ids.add(id.asString()));
        return ids;
    }

    public void closeTerminalSession(String sessionId) {
        send(calls.delete().uri("/internal/terminal/sessions/{sessionId}", sessionId));
    }

    /** Opens a WebSocket to the agent; the returned stage fails when the connection cannot be made. */
    public CompletableFuture<WebSocket> connectWebSocket(String path, WebSocket.Listener listener) {
        return connections.newWebSocketBuilder()
                .connectTimeout(CONNECT_TIMEOUT)
                .header(SECRET_HEADER, properties.sharedSecret())
                .buildAsync(URI.create(toWebSocketUrl(path)), listener);
    }

    private JsonNode readJson(RestClient.RequestHeadersSpec<?> request) {
        String body = send(request);
        try {
            return objectMapper.readTree(body);
        } catch (JacksonException ex) {
            throw new OpsAgentException(502, "Ops agent unavailable.");
        }
    }

    /** Sends the request and answers its body, or fails with the agent's status and message. */
    private String send(RestClient.RequestHeadersSpec<?> request) {
        try {
            return request.exchange((sent, response) -> {
                String body = new String(response.getBody().readAllBytes(), StandardCharsets.UTF_8);
                if (!response.getStatusCode().is2xxSuccessful()) {
                    throw new OpsAgentException(response.getStatusCode().value(), extractMessage(body));
                }
                return body;
            });
        } catch (ResourceAccessException ex) {
            throw new OpsAgentException(502, "Ops agent unavailable.");
        }
    }

    private RestClient restClient(RestClient.Builder agent, Duration readTimeout) {
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(connections);
        factory.setReadTimeout(readTimeout);
        return agent.clone().requestFactory(factory).build();
    }

    private String toWebSocketUrl(String path) {
        String base = properties.baseUrl()
                .replaceFirst("^http://", "ws://")
                .replaceFirst("^https://", "wss://");
        return base + path;
    }

    private String extractMessage(String body) {
        try {
            return objectMapper.readTree(body).path("detail").asString("Ops agent error.");
        } catch (JacksonException ex) {
            return body == null || body.isBlank() ? "Ops agent error." : body;
        }
    }
}
