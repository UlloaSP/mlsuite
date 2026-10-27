package dev.ulloasp.mlsuite.schema.application.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.model.adapter.out.analyzer.ModelRuntimeClient;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.domain.exception.AnalyzerServiceException;
import dev.ulloasp.mlsuite.storage.ModelArtifactReference;
import lombok.RequiredArgsConstructor;

/**
 * The runtime calls of runs made from outside the workspace: one model, named by its artifact,
 * and one record, with no database connection held while the runtime works. {@code caller} names
 * the run in the server log, the only place the runtime's failures are kept in full.
 */
@Component
@RequiredArgsConstructor
public class PublicModelRuntime {

    private static final Logger log = LoggerFactory.getLogger(PublicModelRuntime.class);

    private final ModelRepository modelRepository;
    private final ModelRuntimeClient modelRuntime;
    private final ObjectMapper objectMapper;

    /**
     * The runtime's answer for the record. A record the runtime refused (its 4xx) is thrown as
     * the runtime's own exception, for the caller to word for its audience; any other failure
     * answers 502.
     */
    public Map<String, Object> predict(String caller, Long modelId, Map<String, Object> input) {
        try {
            Map<String, Object> answer = new LinkedHashMap<>();
            modelRuntime.run("/predict", artifact(modelId), Map.of("data", json(input)))
                    .forEach((key, value) -> answer.put(String.valueOf(key), value));
            return answer;
        } catch (AnalyzerServiceException ex) {
            log.warn("{}: the runtime answered {} for model {}: {}", caller, ex.getStatus(), modelId, ex.getDetail());
            if (ex.getStatus() >= 400 && ex.getStatus() < 500) throw ex;
            throw failed();
        } catch (JsonProcessingException | RuntimeException ex) {
            log.error("{}: model {} could not be run", caller, modelId, ex);
            throw failed();
        }
    }

    /**
     * A plugin report is the runtime's explanation of the prediction. A model the runtime cannot
     * explain gives no reports, and the rest of the run stands.
     */
    public List<?> explain(String caller, Long modelId, Map<String, Object> input) {
        try {
            Map<String, String> fields = Map.of("data", json(input), "traces", "[]");
            return modelRuntime.run("/explain", artifact(modelId), fields).get("reports") instanceof List<?> reports
                    ? reports
                    : List.of();
        } catch (JsonProcessingException | RuntimeException ex) {
            log.warn("{}: model {} could not be explained: {}", caller, modelId, ex.getMessage());
            return List.of();
        }
    }

    private ModelArtifactReference artifact(Long modelId) {
        return modelRepository.findArtifactReference(modelId).orElseThrow();
    }

    private String json(Map<String, Object> input) throws JsonProcessingException {
        return objectMapper.writeValueAsString(input);
    }

    static ResponseStatusException failed() {
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "The prediction could not be completed. Try again later.");
    }
}
