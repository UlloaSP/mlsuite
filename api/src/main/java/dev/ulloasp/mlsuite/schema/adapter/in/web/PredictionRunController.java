package dev.ulloasp.mlsuite.schema.adapter.in.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultRepository;
import dev.ulloasp.mlsuite.schema.application.dto.CreatePredictionRunRequest;
import dev.ulloasp.mlsuite.schema.application.dto.PredictionRunDto;
import dev.ulloasp.mlsuite.schema.application.dto.PredictionRunSequenceDto;
import dev.ulloasp.mlsuite.schema.application.port.in.PredictionRunUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
public class PredictionRunController {

    private final CurrentUserResolver currentUserResolver;
    private final PredictionRunUseCase predictionRunUseCase;
    private final PredictionResultRepository resultRepository;

    public PredictionRunController(CurrentUserResolver currentUserResolver, PredictionRunUseCase predictionRunUseCase,
            PredictionResultRepository resultRepository) {
        this.currentUserResolver = currentUserResolver;
        this.predictionRunUseCase = predictionRunUseCase;
        this.resultRepository = resultRepository;
    }

    @PostMapping("/schema-bookmarks/{bookmarkId}/runs")
    public ResponseEntity<PredictionRunDto> createForBookmark(Authentication authentication,
            @PathVariable Long bookmarkId, @Valid @RequestBody CreatePredictionRunRequest request) {
        PredictionRun run = predictionRunUseCase.createRunForBookmark(userId(authentication), bookmarkId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(run));
    }

    @GetMapping("/schema-bookmarks/{bookmarkId}/runs")
    public ResponseEntity<List<PredictionRunDto>> listForBookmark(Authentication authentication,
            @PathVariable Long bookmarkId) {
        return ResponseEntity.ok(predictionRunUseCase.listRunsForBookmark(userId(authentication), bookmarkId).stream()
                .map(this::toDto)
                .toList());
    }

    @GetMapping("/prediction-runs/last-id")
    public ResponseEntity<PredictionRunSequenceDto> lastId(Authentication authentication) {
        return ResponseEntity.ok(new PredictionRunSequenceDto(
                predictionRunUseCase.getLastPredictionRunId(userId(authentication))));
    }

    @GetMapping("/prediction-runs/{runId}")
    public ResponseEntity<PredictionRunDto> get(Authentication authentication, @PathVariable Long runId) {
        return ResponseEntity.ok(toDto(predictionRunUseCase.getRun(userId(authentication), runId)));
    }

    private PredictionRunDto toDto(PredictionRun run) {
        return PredictionRunDto.from(run, resultRepository.findByRunIdOrderByIdAsc(run.getId()));
    }

    private Long userId(Authentication authentication) {
        return currentUserResolver.resolve(authentication).userId();
    }
}
