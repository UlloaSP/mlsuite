package dev.ulloasp.mlsuite.admin;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;

import dev.ulloasp.mlsuite.admin.infrastructure.OpsAgentClient;
import dev.ulloasp.mlsuite.admin.infrastructure.OpsAgentException;
import dev.ulloasp.mlsuite.admin.infrastructure.OpsAgentProperties;

class OpsAgentActionClientTest {
    private HttpServer server;
    private OpsAgentClient client;

    @BeforeEach
    void setUp() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        client = new OpsAgentClient(new ObjectMapper(), new OpsAgentProperties(
                "http://127.0.0.1:" + server.getAddress().getPort(), "qa-test-secret"));
    }

    @AfterEach
    void stopServer() {
        server.stop(0);
    }

    @Test
    void waitsForServiceActionBeyondDefaultTenSecondReadTimeout() {
        AtomicReference<String> payload = new AtomicReference<>();
        server.createContext("/internal/services/py-analyzer/actions", exchange -> {
            payload.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            try {
                Thread.sleep(11_000);
            } catch (InterruptedException error) {
                Thread.currentThread().interrupt();
            }
            exchange.sendResponseHeaders(204, -1);
            exchange.close();
        });
        server.start();

        assertDoesNotThrow(() -> client.action("py-analyzer", "START"));
        assertEquals("{\"action\":\"START\"}", payload.get());
    }

    @Test
    void preservesUpstreamActionFailure() {
        server.createContext("/internal/services/py-analyzer/actions", exchange -> {
            byte[] body = "{\"detail\":\"Docker rejected action\"}".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(400, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();

        OpsAgentException error = assertThrows(OpsAgentException.class,
                () -> client.action("py-analyzer", "START"));
        assertEquals(400, error.getStatus());
        assertEquals("Docker rejected action", error.getMessage());
    }

    @Test
    void reportsUnreachableAgentWithoutClaimingSuccess() {
        server.start();
        server.stop(0);
        OpsAgentException error = assertThrows(OpsAgentException.class,
                () -> client.action("py-analyzer", "START"));
        assertEquals(502, error.getStatus());
    }
}
