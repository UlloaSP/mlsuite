package dev.ulloasp.mlsuite.model.adapter.out.analyzer;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

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
 */
@Component
public class AnalyzerClient {

    static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    static final Duration RUN_TIMEOUT = Duration.ofSeconds(10);
    static final Duration INSPECTION_TIMEOUT = Duration.ofSeconds(50);
    static final String INSPECTION_PATH = "/metadata";

    private final RestTemplate runs;
    private final RestTemplate inspections;
    private final String analyzerUrl;

    @Autowired
    public AnalyzerClient(RestTemplateBuilder builder, @Value("${analyzer.url}") String analyzerUrl) {
        // HTTP/1.1: the runtime speaks nothing else, and the client would otherwise ask to upgrade.
        HttpClient client = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(CONNECT_TIMEOUT)
                .build();
        this(template(builder, client, RUN_TIMEOUT), template(builder, client, INSPECTION_TIMEOUT), analyzerUrl);
    }

    public AnalyzerClient(RestTemplate runs, RestTemplate inspections, String analyzerUrl) {
        this.runs = runs;
        this.inspections = inspections;
        this.analyzerUrl = analyzerUrl;
    }

    /** Asks the runtime what an uploaded bundle holds. */
    public Map<String, Object> inspect(MultiValueMap<String, ?> parts) {
        return post(inspections, INSPECTION_PATH, parts);
    }

    public Map<String, Object> post(String path, MultiValueMap<String, ?> parts) {
        return post(runs, path, parts);
    }

    /** Posts a run that carries its model's artifact, which can take as long as an inspection. */
    public Map<String, Object> postWithArtifact(String path, MultiValueMap<String, ?> parts) {
        return post(inspections, path, parts);
    }

    private Map<String, Object> post(RestTemplate restTemplate, String path, MultiValueMap<String, ?> parts) {
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
        } catch (ResourceAccessException ex) {
            throw AnalyzerServiceException.fromNetwork();
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
