package dev.ulloasp.mlsuite.schema.adapter.in.web;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.schema.application.dto.ConsumerPredictionDto;
import dev.ulloasp.mlsuite.schema.application.dto.ConsumerPredictionRequest;
import dev.ulloasp.mlsuite.schema.application.port.in.ConsumerPredictionUseCase;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Called by outside software with a bookmark API key instead of a session. Everything under
 * /api/public is permitted by SecurityConfig, which also lets any origin call this path without
 * credentials.
 */
@RestController
@RequiredArgsConstructor
public class ConsumerPredictionController {

    private static final String KEY_HEADER = "X-MLSuite-Key";

    private final ConsumerPredictionUseCase predictions;

    /** A missing key is answered like a wrong one, by the service. */
    @PostMapping("/api/public/model-predictions")
    public ResponseEntity<ConsumerPredictionDto> predictWithApiKey(
            @RequestHeader(name = KEY_HEADER, required = false) String key,
            @Valid @RequestBody ConsumerPredictionRequest request) {
        return ResponseEntity.ok(predictions.predict(key, request));
    }
}
