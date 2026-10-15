package dev.ulloasp.mlsuite.schema.application.service;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.model.domain.exception.AnalyzerServiceException;
import dev.ulloasp.mlsuite.schema.application.dto.ConsumerPredictionDto;
import dev.ulloasp.mlsuite.schema.application.dto.ConsumerPredictionRequest;
import dev.ulloasp.mlsuite.schema.application.port.in.ConsumerPredictionUseCase;
import lombok.RequiredArgsConstructor;

/**
 * Runs a public bookmark's model for the holder of one of its API keys. The consumer's record
 * goes to the runtime as sent, under the model's own feature names: the runtime alone checks it
 * against the model. Like PublicPredictionService this class is not transactional and its
 * endpoint is left out of open-in-view, so no connection is held while the runtime works. It
 * shares the public runs' runtime slots and has no quota. A record the runtime refused is
 * answered with the runtime's own words, which only a key holder reads.
 */
@Service
@RequiredArgsConstructor
public class ConsumerPredictionService implements ConsumerPredictionUseCase {

    private static final Logger log = LoggerFactory.getLogger(ConsumerPredictionService.class);

    private final ConsumerRunService runs;
    private final PublicRuntimeSlots slots;
    private final PublicModelRuntime runtime;

    @Override
    public ConsumerPredictionDto predict(String secret, ConsumerPredictionRequest request) {
        ConsumerPredictionPlan plan = runs.plan(secret, request.features());
        Map<String, Object> answer = slots.run(() -> perform(plan));
        // A reply that gives no outputs is a failed run: it is neither answered nor kept.
        ConsumerOutputs.Read read = ConsumerOutputs.of(answer);
        if (read.malformed() != null) {
            log.error("API key {}: the runtime's reply for model {} is malformed: {}",
                    plan.keyId(), plan.modelId(), read.malformed());
            throw PublicModelRuntime.failed();
        }
        runs.record(plan, answer);
        return new ConsumerPredictionDto(read.outputs());
    }

    private Map<String, Object> perform(ConsumerPredictionPlan plan) {
        try {
            return runtime.predict("API key " + plan.keyId(), plan.modelId(), plan.features());
        } catch (AnalyzerServiceException refused) {
            String detail = refused.getDetail() == null || refused.getDetail().isBlank() ? "" : ": " + refused.getDetail();
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "The model could not use these features" + detail);
        }
    }
}
