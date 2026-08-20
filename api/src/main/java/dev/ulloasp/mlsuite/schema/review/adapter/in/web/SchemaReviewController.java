package dev.ulloasp.mlsuite.schema.review.adapter.in.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/schema-reviews")
public class SchemaReviewController {
    private final CurrentUserResolver currentUserResolver;
    private final SchemaReviewUseCase service;
    private final SchemaReviewManagementUseCase management;

    public SchemaReviewController(CurrentUserResolver currentUserResolver, SchemaReviewUseCase service,
            SchemaReviewManagementUseCase management) {
        this.currentUserResolver = currentUserResolver;
        this.service = service;
        this.management = management;
    }

    @PostMapping
    public ResponseEntity<Void> create(Authentication authentication,
            @Valid @RequestBody CreateSchemaReviewRequest request) {
        service.create(userId(authentication), request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @GetMapping("/inbox")
    public ResponseEntity<List<SchemaReviewContextDto>> inbox(Authentication authentication) {
        return ResponseEntity.ok(service.inbox(userId(authentication)));
    }

    @GetMapping("/eligible-reviewers")
    public ResponseEntity<List<SchemaReviewReviewerDto>> eligibleReviewers(Authentication authentication) {
        return ResponseEntity.ok(service.eligibleReviewers(userId(authentication)));
    }

    @GetMapping("/inferences/{predictionRunId}/assignments")
    public ResponseEntity<List<SchemaReviewAssignmentStatusDto>> assignmentStatus(
            Authentication authentication, @PathVariable Long predictionRunId) {
        return ResponseEntity.ok(management.assignmentStatus(userId(authentication), predictionRunId));
    }

    @GetMapping("/{reviewId}/runs/{reviewRunId}")
    public ResponseEntity<SchemaReviewRunDetailDto> detail(Authentication authentication,
            @PathVariable String reviewId, @PathVariable String reviewRunId) {
        return ResponseEntity.ok(service.detail(userId(authentication), reviewId, reviewRunId));
    }

    @PostMapping("/{reviewId}/runs/{reviewRunId}/feedback")
    public ResponseEntity<PredictionResultFeedbackDto> createFeedback(Authentication authentication,
            @PathVariable String reviewId, @PathVariable String reviewRunId,
            @Valid @RequestBody CreatePredictionResultFeedbackRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.createFeedback(userId(authentication), reviewId, reviewRunId, request));
    }

    @PatchMapping("/{reviewId}/runs/{reviewRunId}/feedback")
    public ResponseEntity<PredictionResultFeedbackDto> updateFeedback(Authentication authentication,
            @PathVariable String reviewId, @PathVariable String reviewRunId,
            @Valid @RequestBody UpdatePredictionResultFeedbackRequest request) {
        return ResponseEntity.ok(service.updateFeedback(userId(authentication), reviewId, reviewRunId, request));
    }

    @PostMapping("/{reviewId}/submit")
    public ResponseEntity<Void> submit(Authentication authentication, @PathVariable String reviewId,
            @Valid @RequestBody SubmitSchemaReviewRunsRequest request) {
        service.submit(userId(authentication), reviewId, request.reviewRunIds());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{reviewId}/runs/{reviewRunId}/reviewers/{reviewerId}/reopen")
    public ResponseEntity<Void> reopen(Authentication authentication,
            @PathVariable String reviewId, @PathVariable String reviewRunId,
            @PathVariable Long reviewerId) {
        management.reopen(userId(authentication), reviewId, reviewRunId, reviewerId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{reviewId}/runs/{reviewRunId}/reviewers/{reviewerId}/response")
    public ResponseEntity<Void> deleteResponse(Authentication authentication,
            @PathVariable String reviewId, @PathVariable String reviewRunId,
            @PathVariable Long reviewerId) {
        management.deleteResponse(userId(authentication), reviewId, reviewRunId, reviewerId);
        return ResponseEntity.noContent().build();
    }

    private Long userId(Authentication authentication) {
        return currentUserResolver.resolve(authentication).userId();
    }
}
