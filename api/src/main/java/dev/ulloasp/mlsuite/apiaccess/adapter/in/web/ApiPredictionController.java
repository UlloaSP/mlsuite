package dev.ulloasp.mlsuite.apiaccess.adapter.in.web;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiPredictionDto;
import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiPredictionRequest;
import dev.ulloasp.mlsuite.apiaccess.application.port.in.ApiPredictionUseCase;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * The client API, version 1: called by outside software with a client key instead of a session.
 * SecurityConfig permits /api/v1 and lets any origin call it without credentials; refusals are
 * answered as problems by {@link ApiProblemAdvice}.
 */
@RestController
@RequiredArgsConstructor
public class ApiPredictionController {

    static final String KEY_HEADER = "X-MLSuite-Key";
    static final String REQUEST_ID_HEADER = "X-Request-Id";

    private final ApiPredictionUseCase predictions;

    /** A missing key is answered like a wrong one, by the service. */
    @PostMapping("/api/v1/bookmarks/{bookmarkId}/predictions")
    public ResponseEntity<ApiPredictionDto> predictBookmark(
            @RequestHeader(name = KEY_HEADER, required = false) String key,
            @PathVariable String bookmarkId,
            @Valid @RequestBody ApiPredictionRequest request) {
        ApiPredictionDto prediction = predictions.predict(key, bookmarkId, request);
        return ResponseEntity.ok().header(REQUEST_ID_HEADER, prediction.requestId().toString()).body(prediction);
    }
}
