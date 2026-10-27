package dev.ulloasp.mlsuite.schema.adapter.in.web;

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
import dev.ulloasp.mlsuite.schema.application.dto.CreatePredictionRunsRequest;
import dev.ulloasp.mlsuite.schema.application.dto.CreatedPredictionRunsDto;
import dev.ulloasp.mlsuite.schema.application.dto.PredictionRunDto;
import dev.ulloasp.mlsuite.schema.application.dto.PredictionRunCatalogItemDto;
import dev.ulloasp.mlsuite.schema.application.dto.WorkspacePredictionBatchDto;
import dev.ulloasp.mlsuite.schema.application.dto.WorkspacePredictionBatchRequest;
import dev.ulloasp.mlsuite.schema.application.dto.WorkspacePredictionDto;
import dev.ulloasp.mlsuite.schema.application.dto.WorkspacePredictionRequest;
import dev.ulloasp.mlsuite.schema.application.port.in.PredictionRunUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.WorkspacePredictionUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PredictionRunController {

    private final PredictionRunUseCase predictionRunUseCase;
    private final WorkspacePredictionUseCase workspacePredictionUseCase;
    private final PredictionResultRepository resultRepository;

    @PostMapping("/schema-bookmarks/{bookmarkId}/predictions")
    public ResponseEntity<WorkspacePredictionDto> predictForBookmark(CurrentUser user,
            @PathVariable Long bookmarkId, @Valid @RequestBody WorkspacePredictionRequest request) {
        return ResponseEntity.ok(workspacePredictionUseCase.predict(user.userId(), bookmarkId, request));
    }

    @PostMapping("/schema-bookmarks/{bookmarkId}/predictions/batch")
    public ResponseEntity<WorkspacePredictionBatchDto> predictBatchForBookmark(CurrentUser user,
            @PathVariable Long bookmarkId, @Valid @RequestBody WorkspacePredictionBatchRequest request) {
        return ResponseEntity.ok(workspacePredictionUseCase.predictBatch(user.userId(), bookmarkId, request));
    }

    @PostMapping("/schema-bookmarks/{bookmarkId}/runs")
    public ResponseEntity<PredictionRunDto> createForBookmark(CurrentUser user,
            @PathVariable Long bookmarkId, @Valid @RequestBody CreatePredictionRunRequest request) {
        PredictionRun run = predictionRunUseCase.createRunForBookmark(user.userId(), bookmarkId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(run));
    }

    @PostMapping("/schema-bookmarks/{bookmarkId}/runs/batch")
    public ResponseEntity<CreatedPredictionRunsDto> createManyForBookmark(CurrentUser user,
            @PathVariable Long bookmarkId, @Valid @RequestBody CreatePredictionRunsRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(new CreatedPredictionRunsDto(
                predictionRunUseCase.createRunsForBookmark(user.userId(), bookmarkId, request.runs())));
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
