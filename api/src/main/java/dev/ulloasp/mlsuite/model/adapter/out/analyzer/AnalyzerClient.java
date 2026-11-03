package dev.ulloasp.mlsuite.model.adapter.out.analyzer;

import java.net.ConnectException;
import java.net.UnknownHostException;
import java.net.http.HttpClient;
import java.net.http.HttpConnectTimeoutException;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.restclient.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

import dev.ulloasp.mlsuite.model.domain.exception.AnalyzerServiceException;

/**
 * Posts multipart requests to the Python runtime and translates its failures. Every request goes
 * through one JDK client, which keeps its connections to the runtime open and reuses them rather
 * than connecting for each request, and streams the body, so an artifact sent to the runtime is
 * not copied again.
 *
 * <p>A run (a prediction or an explanation) must answer within {@link #RUN_TIMEOUT}; it waited
 * for its turn in a runtime share before (see RuntimeSlots), and the share keeps the runtime's
 * work bounded so an admitted run finishes in time. A request that carries a whole bundle (an
 * inspection, or a run resent with its artifact) takes longer, so it has {@link #INSPECTION_TIMEOUT},
 * below the 60 seconds nginx waits for the API.
 *
 * <p>A run that never reached the runtime, because nothing listened at its address, the address
 * did not resolve or the connection timed out, is sent again until {@link #START_WAIT} has passed:
 * that is the runtime restarting, which stops listening for the seconds its process takes to
 * start, and resending is safe because the runtime saw nothing. A request the runtime received is
 * never sent twice by this client. A request that carries a bundle is not sent again: its timeout
 * leaves no room for the wait under nginx's limit.
 */
@Component
public class AnalyzerClient {

    static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    static final Duration RUN_TIMEOUT = Duration.ofSeconds(10);
    static final Duration INSPECTION_TIMEOUT = Duration.ofSeconds(50);
    static final Duration START_WAIT = Duration.ofSeconds(8);
    static final String INSPECTION_PATH = "/metadata";
    private static final Duration RESEND_PAUSE = Duration.ofMillis(250);
    private static final Logger log = LoggerFactory.getLogger(AnalyzerClient.class);

    private final RestTemplate runs;
    private final RestTemplate inspections;
    private final String analyzerUrl;
    private final Duration startWait;

    @Autowired
    public AnalyzerClient(RestTemplateBuilder builder, @Value("${analyzer.url}") String analyzerUrl) {
        // HTTP/1.1: the runtime speaks nothing else, and the client would otherwise ask to upgrade.
        HttpClient client = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(CONNECT_TIMEOUT)
                .build();
        this(template(builder, client, RUN_TIMEOUT), template(builder, client, INSPECTION_TIMEOUT), analyzerUrl,
                START_WAIT);
    }

    public AnalyzerClient(RestTemplate runs, RestTemplate inspections, String analyzerUrl) {
        this(runs, inspections, analyzerUrl, START_WAIT);
    }

    AnalyzerClient(RestTemplate runs, RestTemplate inspections, String analyzerUrl, Duration startWait) {
        this.runs = runs;
        this.inspections = inspections;
        this.analyzerUrl = analyzerUrl;
        this.startWait = startWait;
    }

    /** Asks the runtime what an uploaded bundle holds. */
    public Map<String, Object> inspect(MultiValueMap<String, ?> parts) {
        return post(inspections, INSPECTION_PATH, parts, Duration.ZERO);
    }

    public Map<String, Object> post(String path, MultiValueMap<String, ?> parts) {
        return post(runs, path, parts, startWait);
    }

    /** Posts a run that carries its model's artifact, which can take as long as an inspection. */
    public Map<String, Object> postWithArtifact(String path, MultiValueMap<String, ?> parts) {
        return post(inspections, path, parts, Duration.ZERO);
    }

    private Map<String, Object> post(RestTemplate restTemplate, String path, MultiValueMap<String, ?> parts,
            Duration wait) {
        long deadline = System.nanoTime() + wait.toNanos();
        while (true) {
            try {
                return exchange(restTemplate, path, parts);
            } catch (ResourceAccessException ex) {
                if (!undelivered(ex) || System.nanoTime() + RESEND_PAUSE.toNanos() > deadline) {
                    log.warn("The runtime did not answer {}: {}", path, ex.getMessage());
                    throw AnalyzerServiceException.fromNetwork();
                }
            }
            try {
                Thread.sleep(RESEND_PAUSE);
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
                throw AnalyzerServiceException.fromNetwork();
            }
        }
    }

    /** Whether the request failed before reaching the runtime, so the runtime saw none of it. */
    private static boolean undelivered(Throwable failure) {
        for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
            if (cause instanceof ConnectException || cause instanceof UnknownHostException
                    || cause instanceof HttpConnectTimeoutException) {
                return true;
            }
        }
        return false;
    }

    private Map<String, Object> exchange(RestTemplate restTemplate, String path, MultiValueMap<String, ?> parts) {
        String endpoint = analyzerUrl + path;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        try {
            Map<?, ?> response = restTemplate.postForObject(endpoint, new HttpEntity<>(parts, headers), Map.class);
            if (response == null) {
                return Map.of();
            }
            // The analyzer answers JSON, where a key may hold null: a model without importances.
            Map<String, Object> answer = new LinkedHashMap<>();
            response.forEach((key, value) -> {
                if (key instanceof String name) answer.put(name, value);
            });
            return answer;
        } catch (RestClientResponseException ex) {
            throw AnalyzerServiceException.fromRestClient(ex);
        }
    }

    private static RestTemplate template(RestTemplateBuilder builder, HttpClient client, Duration readTimeout) {
        return builder.requestFactory(() -> {
            JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(client);
            factory.setReadTimeout(readTimeout);
            return factory;
        }).build();
    }
}
