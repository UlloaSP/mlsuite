package dev.ulloasp.mlsuite.model.adapter.out.analyzer;

import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

import dev.ulloasp.mlsuite.model.domain.exception.AnalyzerServiceException;

/** Posts multipart requests to the Python runtime and translates its failures. */
@Component
public class AnalyzerClient {

    private final RestTemplate restTemplate;
    private final String analyzerUrl;

    public AnalyzerClient(RestTemplate restTemplate, @Value("${analyzer.url}") String analyzerUrl) {
        this.restTemplate = restTemplate;
        this.analyzerUrl = analyzerUrl;
    }

    public Map<String, Object> post(String path, MultiValueMap<String, ?> parts) {
        String endpoint = analyzerUrl + path;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        try {
            Map<?, ?> response = restTemplate.postForObject(endpoint, new HttpEntity<>(parts, headers), Map.class);
            if (response == null) {
                return Map.of();
            }
            return response.entrySet().stream()
                    .filter(entry -> entry.getKey() instanceof String)
                    .collect(Collectors.toMap(entry -> (String) entry.getKey(), Map.Entry::getValue));
        } catch (RestClientResponseException ex) {
            throw AnalyzerServiceException.fromRestClient(ex);
        } catch (ResourceAccessException ex) {
            throw AnalyzerServiceException.fromNetwork();
        }
    }
}
