package dev.ulloasp.mlsuite.schema.adapter.in.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultRepository;
import dev.ulloasp.mlsuite.schema.application.dto.CreatePredictionRunRequest;
import dev.ulloasp.mlsuite.schema.application.dto.PredictionRunDto;
import dev.ulloasp.mlsuite.schema.application.dto.PredictionRunCatalogItemDto;
import dev.ulloasp.mlsuite.schema.application.dto.PredictionRunSequenceDto;
import dev.ulloasp.mlsuite.schema.application.port.in.PredictionRunUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PredictionRunController {

    private final PredictionRunUseCase predictionRunUseCase;
    private final PredictionResultRepository resultRepository;

    @PostMapping("/schema-bookmarks/{bookmarkId}/runs")
    public ResponseEntity<PredictionRunDto> createForBookmark(CurrentUser user,
            @PathVariable Long bookmarkId, @Valid @RequestBody CreatePredictionRunRequest request) {
        PredictionRun run = predictionRunUseCase.createRunForBookmark(user.userId(), bookmarkId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(run));
    }

    @GetMapping("/schema-bookmarks/{bookmarkId}/runs")
    public ResponseEntity<List<PredictionRunDto>> listForBookmark(CurrentUser user,
            @PathVariable Long bookmarkId) {
        return ResponseEntity.ok(predictionRunUseCase.listRunsForBookmark(user.userId(), bookmarkId).stream()
                .map(this::toDto)
                .toList());
    }

    @GetMapping("/prediction-runs/last-id")
    public ResponseEntity<PredictionRunSequenceDto> lastId(CurrentUser user) {
        return ResponseEntity.ok(new PredictionRunSequenceDto(
                predictionRunUseCase.getLastPredictionRunId(user.userId())));
    }

    @GetMapping("/prediction-runs")
    public ResponseEntity<List<PredictionRunCatalogItemDto>> listOrganizationRuns(CurrentUser user) {
        return ResponseEntity.ok(predictionRunUseCase.listOrganizationRuns(user.userId()).stream()
                .map(PredictionRunCatalogItemDto::from)
                .toList());
    }

    @GetMapping("/prediction-runs/{runId}")
    public ResponseEntity<PredictionRunDto> get(CurrentUser user, @PathVariable Long runId) {
        return ResponseEntity.ok(toDto(predictionRunUseCase.getRun(user.userId(), runId)));
    }

    @GetMapping("/prediction-runs/{runId}/summary")
    public ResponseEntity<PredictionRunCatalogItemDto> summary(CurrentUser user, @PathVariable Long runId) {
        return ResponseEntity.ok(PredictionRunCatalogItemDto.from(predictionRunUseCase.getRun(user.userId(), runId)));
    }

    @DeleteMapping("/prediction-runs/{runId}")
    public ResponseEntity<Void> delete(CurrentUser user, @PathVariable Long runId) {
        predictionRunUseCase.deleteRun(user.userId(), runId);
        return ResponseEntity.noContent().build();
    }

    private PredictionRunDto toDto(PredictionRun run) {
        return PredictionRunDto.from(run, resultRepository.findByRunIdOrderByIdAsc(run.getId()));
    }
}
