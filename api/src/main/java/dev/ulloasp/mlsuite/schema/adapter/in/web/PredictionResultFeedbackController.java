package dev.ulloasp.mlsuite.schema.adapter.in.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/prediction-result-feedback")
@RequiredArgsConstructor
public class PredictionResultFeedbackController {

    private final PredictionResultFeedbackUseCase feedbackUseCase;

    @PostMapping
    public ResponseEntity<PredictionResultFeedbackDto> create(CurrentUser user,
            @Valid @RequestBody CreatePredictionResultFeedbackRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(PredictionResultFeedbackDto.from(feedbackUseCase.create(user.userId(), request)));
    }

    @PatchMapping
    public ResponseEntity<PredictionResultFeedbackDto> update(CurrentUser user,
            @Valid @RequestBody UpdatePredictionResultFeedbackRequest request) {
        return ResponseEntity.ok(PredictionResultFeedbackDto.from(feedbackUseCase.update(user.userId(), request)));
    }

    @GetMapping
    public ResponseEntity<List<PredictionResultFeedbackDto>> list(CurrentUser user,
            @RequestParam Long resultId) {
        return ResponseEntity.ok(PredictionResultFeedbackDto.fromList(
                feedbackUseCase.listByResult(user.userId(), resultId)));
    }

    @GetMapping("/by-runs")
    public ResponseEntity<List<PredictionResultFeedbackDto>> listByRuns(CurrentUser user,
            @RequestParam List<Long> runIds) {
        return ResponseEntity.ok(PredictionResultFeedbackDto.fromList(
                feedbackUseCase.listByRuns(user.userId(), runIds)));
    }
}
