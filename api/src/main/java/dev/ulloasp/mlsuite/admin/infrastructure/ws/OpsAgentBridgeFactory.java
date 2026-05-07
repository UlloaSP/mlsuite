package dev.ulloasp.mlsuite.admin.infrastructure.ws;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import dev.ulloasp.mlsuite.admin.infrastructure.OpsAgentClient;
import okhttp3.Response;
import okhttp3.WebSocket;
import okhttp3.WebSocketListener;

@Component
public class OpsAgentBridgeFactory {

    private final OpsAgentClient opsAgentClient;
    private final Map<String, WebSocket> bridges = new ConcurrentHashMap<>();

    public OpsAgentBridgeFactory(OpsAgentClient opsAgentClient) {
        this.opsAgentClient = opsAgentClient;
    }

    public void open(WebSocketSession downstream, String path) {
        WebSocket upstream = opsAgentClient.connectWebSocket(path, new ForwardingListener(downstream));
        bridges.put(downstream.getId(), upstream);
    }

    public void send(WebSocketSession downstream, String payload) {
        WebSocket upstream = bridges.get(downstream.getId());
        if (upstream != null) {
            upstream.send(payload);
        }
    }

    public void close(WebSocketSession downstream) {
        WebSocket upstream = bridges.remove(downstream.getId());
        if (upstream != null) {
            upstream.close(1000, "Downstream closed");
        }
    }

    private static final class ForwardingListener extends WebSocketListener {

        private final WebSocketSession downstream;

        private ForwardingListener(WebSocketSession downstream) {
            this.downstream = downstream;
        }

        @Override
        public void onMessage(WebSocket webSocket, String text) {
            try {
                if (downstream.isOpen()) {
                    downstream.sendMessage(new TextMessage(text));
                }
            } catch (IOException ex) {
                closeQuietly(downstream, new CloseStatus(1011, "Bridge write failed"));
            }
        }

        @Override
        public void onClosing(WebSocket webSocket, int code, String reason) {
            closeQuietly(downstream, new CloseStatus(code, reason));
        }

        @Override
        public void onFailure(WebSocket webSocket, Throwable throwable, Response response) {
            closeQuietly(downstream, new CloseStatus(1011, "Ops bridge failed"));
        }

        private void closeQuietly(WebSocketSession session, CloseStatus status) {
            try {
                if (session.isOpen()) {
                    session.close(status);
                }
            } catch (IOException ignored) {
                // ignore close failure
            }
        }
    }
}
