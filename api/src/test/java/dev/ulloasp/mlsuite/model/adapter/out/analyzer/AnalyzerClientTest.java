package dev.ulloasp.mlsuite.model.adapter.out.analyzer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import com.sun.net.httpserver.HttpServer;

import dev.ulloasp.mlsuite.model.domain.exception.AnalyzerServiceException;

/**
 * The runtime stops listening while it restarts. A run sent then reached nothing, so it is sent
 * again until the runtime listens; a run the runtime received is never sent twice, and a bundle
 * inspection is not resent.
 */
class AnalyzerClientTest {

    private final AtomicInteger received = new AtomicInteger();
    private HttpServer runtime;

    @AfterEach
    void stopRuntime() {
        if (runtime != null) runtime.stop(0);
    }

    @Test
    void aRunSentWhileTheRuntimeRestartsIsAnsweredOnceItListens() throws Exception {
        int port = freePort();
        Thread restart = Thread.ofVirtual().start(() -> {
            sleep(Duration.ofMillis(700));
            listen(port, 200, "{\"prediction\":1}");
        });

        Map<String, Object> answer = client(port, Duration.ofSeconds(5)).post("/predict", parts());

        restart.join();
        assertEquals(Map.of("prediction", 1), answer);
        assertEquals(1, received.get());
    }

    @Test
    void aRuntimeThatNeverListensIsUnreachableOnceTheWaitIsOver() throws Exception {
        long started = System.nanoTime();

        AnalyzerServiceException failure = assertThrows(AnalyzerServiceException.class,
                () -> client(freePort(), Duration.ofMillis(600)).post("/predict", parts()));

        assertEquals(0, failure.getStatus());
        assertEquals("Analyzer service unreachable", failure.getMessage());
        assertTrue(Duration.ofNanos(System.nanoTime() - started).compareTo(Duration.ofMillis(300)) > 0);
    }

    @Test
    void anInspectionIsNotSentAgainSinceItsTimeoutLeavesNoRoomToWait() throws Exception {
        long started = System.nanoTime();

        assertThrows(AnalyzerServiceException.class,
                () -> client(freePort(), Duration.ofSeconds(5)).inspect(parts()));

        assertTrue(Duration.ofNanos(System.nanoTime() - started).compareTo(Duration.ofSeconds(2)) < 0);
    }

    @Test
    void aRunTheRuntimeReceivedIsNotSentAgain() throws Exception {
        int port = freePort();
        listen(port, 500, "{\"detail\":\"The model failed\"}");

        AnalyzerServiceException failure = assertThrows(AnalyzerServiceException.class,
                () -> client(port, Duration.ofSeconds(5)).post("/predict", parts()));

        assertEquals(500, failure.getStatus());
        assertEquals("The model failed", failure.getDetail());
        assertEquals(1, received.get());
    }

    private static AnalyzerClient client(int port, Duration startWait) {
        HttpClient http = HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(AnalyzerClient.CONNECT_TIMEOUT).build();
        RestTemplate template = new RestTemplate(new JdkClientHttpRequestFactory(http));
        return new AnalyzerClient(template, template, "http://127.0.0.1:" + port, startWait);
    }

    private void listen(int port, int status, String body) {
        try {
            runtime = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), port), 0);
        } catch (IOException ex) {
            throw new IllegalStateException(ex);
        }
        runtime.createContext("/predict", exchange -> {
            received.incrementAndGet();
            exchange.getRequestBody().readAllBytes();
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(status, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.close();
        });
        runtime.start();
    }

    private static MultiValueMap<String, Object> parts() {
        MultiValueMap<String, Object> parts = new LinkedMultiValueMap<>();
        parts.add("artifact_sha256", "abc");
        return parts;
    }

    /** A port nothing listens on: connecting to it is refused. */
    private static int freePort() throws IOException {
        try (ServerSocket socket = new ServerSocket(0, 0, InetAddress.getLoopbackAddress())) {
            return socket.getLocalPort();
        }
    }

    private static void sleep(Duration duration) {
        try {
            Thread.sleep(duration);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        }
    }
}
