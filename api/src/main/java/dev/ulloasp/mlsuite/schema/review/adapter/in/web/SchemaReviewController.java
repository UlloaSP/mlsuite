package dev.ulloasp.mlsuite.schema.review.adapter.in.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.schema.application.dto.CreatePredictionResultFeedbackRequest;
import dev.ulloasp.mlsuite.schema.application.dto.PredictionResultFeedbackDto;
import dev.ulloasp.mlsuite.schema.application.dto.UpdatePredictionResultFeedbackRequest;
import dev.ulloasp.mlsuite.schema.review.application.dto.CreateSchemaReviewRequest;
import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewAssignmentStatusDto;
import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewContextDto;
import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewRunDetailDto;
import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewReviewerDto;
import dev.ulloasp.mlsuite.schema.review.application.dto.SubmitSchemaReviewRunsRequest;
import dev.ulloasp.mlsuite.schema.review.application.port.in.SchemaReviewManagementUseCase;
import dev.ulloasp.mlsuite.schema.review.application.port.in.SchemaReviewUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/schema-reviews")
@RequiredArgsConstructor
public class SchemaReviewController {
    private final SchemaReviewUseCase service;
    private final SchemaReviewManagementUseCase management;

    @PostMapping
    public ResponseEntity<Void> create(CurrentUser user,
            @Valid @RequestBody CreateSchemaReviewRequest request) {
        service.create(user.userId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @GetMapping("/inbox")
    public ResponseEntity<List<SchemaReviewContextDto>> inbox(CurrentUser user) {
        return ResponseEntity.ok(service.inbox(user.userId()));
    }

    @GetMapping("/eligible-reviewers")
    public ResponseEntity<List<SchemaReviewReviewerDto>> eligibleReviewers(CurrentUser user) {
        return ResponseEntity.ok(service.eligibleReviewers(user.userId()));
    }

    @GetMapping("/inferences/{predictionRunId}/assignments")
    public ResponseEntity<List<SchemaReviewAssignmentStatusDto>> assignmentStatus(
            CurrentUser user, @PathVariable Long predictionRunId) {
        return ResponseEntity.ok(management.assignmentStatus(user.userId(), predictionRunId));
    }

    @GetMapping("/{reviewId}/runs/{reviewRunId}")
    public ResponseEntity<SchemaReviewRunDetailDto> detail(CurrentUser user,
            @PathVariable String reviewId, @PathVariable String reviewRunId) {
        return ResponseEntity.ok(service.detail(user.userId(), reviewId, reviewRunId));
    }

    @PostMapping("/{reviewId}/runs/{reviewRunId}/feedback")
    public ResponseEntity<PredictionResultFeedbackDto> createFeedback(CurrentUser user,
            @PathVariable String reviewId, @PathVariable String reviewRunId,
            @Valid @RequestBody CreatePredictionResultFeedbackRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.createFeedback(user.userId(), reviewId, reviewRunId, request));
    }

    @PatchMapping("/{reviewId}/runs/{reviewRunId}/feedback")
    public ResponseEntity<PredictionResultFeedbackDto> updateFeedback(CurrentUser user,
            @PathVariable String reviewId, @PathVariable String reviewRunId,
            @Valid @RequestBody UpdatePredictionResultFeedbackRequest request) {
        return ResponseEntity.ok(service.updateFeedback(user.userId(), reviewId, reviewRunId, request));
    }

    @PostMapping("/{reviewId}/submit")
    public ResponseEntity<Void> submit(CurrentUser user, @PathVariable String reviewId,
            @Valid @RequestBody SubmitSchemaReviewRunsRequest request) {
        service.submit(user.userId(), reviewId, request.reviewRunIds());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{reviewId}/runs/{reviewRunId}/reviewers/{reviewerId}/reopen")
    public ResponseEntity<Void> reopen(CurrentUser user,
            @PathVariable String reviewId, @PathVariable String reviewRunId,
            @PathVariable Long reviewerId) {
        management.reopen(user.userId(), reviewId, reviewRunId, reviewerId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{reviewId}/runs/{reviewRunId}/reviewers/{reviewerId}/response")
    public ResponseEntity<Void> deleteResponse(CurrentUser user,
            @PathVariable String reviewId, @PathVariable String reviewRunId,
            @PathVariable Long reviewerId) {
        management.deleteResponse(user.userId(), reviewId, reviewRunId, reviewerId);
        return ResponseEntity.noContent().build();
    }
}
