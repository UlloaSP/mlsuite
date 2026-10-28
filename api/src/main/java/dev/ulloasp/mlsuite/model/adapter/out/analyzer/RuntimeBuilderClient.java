package dev.ulloasp.mlsuite.model.adapter.out.analyzer;

import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.restclient.RestTemplateBuilder;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

import dev.ulloasp.mlsuite.model.domain.exception.AnalyzerServiceException;
import dev.ulloasp.mlsuite.model.domain.model.RuntimeEnvironment;

/**
 * The runtime's environment builder: installs the environment a model's lock names (the
 * builder checks it against the allowlist again) and removes one no model uses any longer.
 * Installing downloads every wheel the first time, so a build may take minutes.
 */
@Component
public class RuntimeBuilderClient {

    static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    static final Duration BUILD_TIMEOUT = Duration.ofMinutes(20);

    private final RestTemplate builds;
    private final String builderUrl;

    @Autowired
    public RuntimeBuilderClient(RestTemplateBuilder builder, @Value("${runtime-builder.url}") String builderUrl) {
        HttpClient client = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(CONNECT_TIMEOUT)
                .build();
        this(builder.requestFactory(() -> {
            JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(client);
            factory.setReadTimeout(BUILD_TIMEOUT);
            return factory;
        }).build(), builderUrl);
    }

    public RuntimeBuilderClient(RestTemplate builds, String builderUrl) {
        this.builds = builds;
        this.builderUrl = builderUrl;
    }

    /** Builds the environment unless the builder already has it. */
    public void build(RuntimeEnvironment environment) {
        Map<String, String> request = Map.of(
                "key", environment.getKey(),
                "writerVersion", environment.getWriterVersion(),
                "lock", Base64.getEncoder().encodeToString(environment.getLockToml().getBytes(StandardCharsets.UTF_8)));
        try {
            builds.postForObject(builderUrl + "/environments", request, Map.class);
        } catch (RestClientResponseException ex) {
            throw AnalyzerServiceException.fromRestClient(ex);
        } catch (ResourceAccessException ex) {
            throw new AnalyzerServiceException(0, "The environment builder is unreachable");
        }
    }

    public void remove(String environmentKey) {
        try {
            builds.delete(builderUrl + "/environments/{key}", environmentKey);
        } catch (RestClientResponseException ex) {
            throw AnalyzerServiceException.fromRestClient(ex);
        } catch (ResourceAccessException ex) {
            throw new AnalyzerServiceException(0, "The environment builder is unreachable");
        }
    }
}
