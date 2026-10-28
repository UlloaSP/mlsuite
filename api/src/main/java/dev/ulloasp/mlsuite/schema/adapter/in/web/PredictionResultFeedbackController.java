package dev.ulloasp.mlsuite.schema.adapter.in.web;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.schema.application.dto.PredictionResultFeedbackDto;
import dev.ulloasp.mlsuite.schema.application.dto.PredictionResultFeedbackRevisionDto;
import dev.ulloasp.mlsuite.schema.application.port.in.PredictionResultFeedbackUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/prediction-result-feedback")
@RequiredArgsConstructor
public class PredictionResultFeedbackController {

    private final PredictionResultFeedbackUseCase feedbackUseCase;

    @GetMapping
    public ResponseEntity<List<PredictionResultFeedbackDto>> list(CurrentUser user,
            @RequestParam Long resultId) {
        return ResponseEntity.ok(PredictionResultFeedbackDto.fromList(
                feedbackUseCase.listByResult(user.userId(), resultId)));
    }

    @GetMapping("/history")
    public ResponseEntity<List<PredictionResultFeedbackRevisionDto>> history(CurrentUser user,
            @RequestParam Long resultId) {
        return ResponseEntity.ok(feedbackUseCase.historyOfResult(user.userId(), resultId));
    }

    @GetMapping("/by-runs")
    public ResponseEntity<List<PredictionResultFeedbackDto>> listByRuns(CurrentUser user,
            @RequestParam List<Long> runIds) {
        return ResponseEntity.ok(PredictionResultFeedbackDto.fromList(
                feedbackUseCase.listByRuns(user.userId(), runIds)));
    }
}
