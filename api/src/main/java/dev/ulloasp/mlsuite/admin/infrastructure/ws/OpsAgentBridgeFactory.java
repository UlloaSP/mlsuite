package dev.ulloasp.mlsuite.admin.infrastructure.ws;

import java.io.IOException;
import java.net.http.WebSocket;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import dev.ulloasp.mlsuite.admin.infrastructure.OpsAgentClient;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class OpsAgentBridgeFactory {

    private static final CloseStatus BRIDGE_FAILED = new CloseStatus(1011, "Ops bridge failed");

    private final OpsAgentClient opsAgentClient;
    private final Map<String, Upstream> bridges = new ConcurrentHashMap<>();

    public void open(WebSocketSession downstream, String path) {
        CompletableFuture<WebSocket> connection = opsAgentClient.connectWebSocket(path, new ForwardingListener(downstream));
        bridges.put(downstream.getId(), new Upstream(connection, downstream));
    }

    public void send(WebSocketSession downstream, String payload) {
        Upstream upstream = bridges.get(downstream.getId());
        if (upstream != null) {
            upstream.then(webSocket -> webSocket.sendText(payload, true));
        }
    }

    public void close(WebSocketSession downstream) {
        Upstream upstream = bridges.remove(downstream.getId());
        if (upstream != null) {
            upstream.then(webSocket -> webSocket.sendClose(WebSocket.NORMAL_CLOSURE, "Downstream closed"));
        }
    }

    private static void closeQuietly(WebSocketSession session, CloseStatus status) {
        try {
            if (session.isOpen()) {
                session.close(status);
            }
        } catch (IOException ignored) {
            // ignore close failure
        }
    }

    /**
     * The agent's side of a bridge. A JDK WebSocket takes one send at a time, so each send waits
     * for the connection and the send before it; what is sent before the connection opens waits
     * for it. A connection or a send that fails closes the browser's side.
     */
    private static final class Upstream {

        private final WebSocketSession downstream;
        private CompletableFuture<WebSocket> last;

        private Upstream(CompletableFuture<WebSocket> connection, WebSocketSession downstream) {
            this.downstream = downstream;
            this.last = connection;
            closeOnFailure(connection);
        }

        private synchronized void then(Function<WebSocket, CompletableFuture<WebSocket>> step) {
            last = last.thenCompose(step);
            closeOnFailure(last);
        }

        private void closeOnFailure(CompletableFuture<WebSocket> stage) {
            stage.exceptionally(failure -> {
                closeQuietly(downstream, BRIDGE_FAILED);
                return null;
            });
        }
    }

    private static final class ForwardingListener implements WebSocket.Listener {

        private final WebSocketSession downstream;
        private final StringBuilder message = new StringBuilder();

        private ForwardingListener(WebSocketSession downstream) {
            this.downstream = downstream;
        }

        @Override
        public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
            message.append(data);
            if (last) {
                forward(message.toString());
                message.setLength(0);
            }
            webSocket.request(1);
            return null;
        }

        @Override
        public CompletionStage<?> onClose(WebSocket webSocket, int statusCode, String reason) {
            closeQuietly(downstream, new CloseStatus(statusCode, reason));
            return null;
        }

        @Override
        public void onError(WebSocket webSocket, Throwable error) {
            closeQuietly(downstream, BRIDGE_FAILED);
        }

        private void forward(String text) {
            try {
                if (downstream.isOpen()) {
                    downstream.sendMessage(new TextMessage(text));
                }
            } catch (IOException ex) {
                closeQuietly(downstream, new CloseStatus(1011, "Bridge write failed"));
            }
        }
    }
}
