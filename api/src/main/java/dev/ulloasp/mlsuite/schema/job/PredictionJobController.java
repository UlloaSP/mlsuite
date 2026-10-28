package dev.ulloasp.mlsuite.schema.job;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class PredictionJobController {

    private final PredictionJobService jobs;

    @PostMapping("/schema-bookmarks/{bookmarkId}/prediction-jobs")
    public ResponseEntity<PredictionJobDto> start(CurrentUser user, @PathVariable Long bookmarkId,
            @Valid @RequestBody CreatePredictionJobRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(jobs.start(user.userId(), bookmarkId, request));
    }

    @GetMapping("/schema-bookmarks/{bookmarkId}/prediction-jobs")
    public ResponseEntity<List<PredictionJobDto>> list(CurrentUser user, @PathVariable Long bookmarkId) {
        return ResponseEntity.ok(jobs.list(user.userId(), bookmarkId));
    }

    @GetMapping("/prediction-jobs/{jobId}")
    public ResponseEntity<PredictionJobDto> get(CurrentUser user, @PathVariable Long jobId) {
        return ResponseEntity.ok(jobs.get(user.userId(), jobId));
    }

    @GetMapping("/prediction-jobs/{jobId}/failures")
    public ResponseEntity<List<PredictionJobFailureDto>> failures(CurrentUser user, @PathVariable Long jobId) {
        return ResponseEntity.ok(jobs.failures(user.userId(), jobId));
    }

    @PostMapping("/prediction-jobs/{jobId}/cancel")
    public ResponseEntity<PredictionJobDto> cancel(CurrentUser user, @PathVariable Long jobId) {
        return ResponseEntity.ok(jobs.cancel(user.userId(), jobId));
    }

    @PostMapping("/prediction-jobs/{jobId}/retry")
    public ResponseEntity<PredictionJobDto> retry(CurrentUser user, @PathVariable Long jobId) {
        return ResponseEntity.ok(jobs.retry(user.userId(), jobId));
    }
}
