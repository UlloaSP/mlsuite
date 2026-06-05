package dev.ulloasp.mlsuite.schema.adapter.in.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.schema.application.dto.CreatePredictionResultFeedbackRequest;
import dev.ulloasp.mlsuite.schema.application.dto.PredictionResultFeedbackDto;
import dev.ulloasp.mlsuite.schema.application.dto.UpdatePredictionResultFeedbackRequest;
import dev.ulloasp.mlsuite.schema.application.port.in.PredictionResultFeedbackUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/prediction-result-feedback")
public class PredictionResultFeedbackController {

    private final CurrentUserResolver currentUserResolver;
    private final PredictionResultFeedbackUseCase feedbackUseCase;

    public PredictionResultFeedbackController(CurrentUserResolver currentUserResolver,
            PredictionResultFeedbackUseCase feedbackUseCase) {
        this.currentUserResolver = currentUserResolver;
        this.feedbackUseCase = feedbackUseCase;
    }

    @PostMapping
    public ResponseEntity<PredictionResultFeedbackDto> create(Authentication authentication,
            @Valid @RequestBody CreatePredictionResultFeedbackRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(PredictionResultFeedbackDto.from(feedbackUseCase.create(userId(authentication), request)));
    }

    @PatchMapping
    public ResponseEntity<PredictionResultFeedbackDto> update(Authentication authentication,
            @Valid @RequestBody UpdatePredictionResultFeedbackRequest request) {
        return ResponseEntity.ok(PredictionResultFeedbackDto.from(feedbackUseCase.update(userId(authentication), request)));
    }

    @GetMapping
    public ResponseEntity<List<PredictionResultFeedbackDto>> list(Authentication authentication,
            @RequestParam Long resultId) {
        return ResponseEntity.ok(PredictionResultFeedbackDto.fromList(
                feedbackUseCase.listByResult(userId(authentication), resultId)));
    }

    private Long userId(Authentication authentication) {
        return currentUserResolver.resolve(authentication).userId();
    }
}
