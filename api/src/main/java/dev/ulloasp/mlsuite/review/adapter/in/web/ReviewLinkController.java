package dev.ulloasp.mlsuite.review.adapter.in.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.prediction.application.dto.CreateExplanationFeedbackParams;
import dev.ulloasp.mlsuite.prediction.application.dto.CreateOutputFeedbackParams;
import dev.ulloasp.mlsuite.prediction.application.dto.ExplanationFeedbackDto;
import dev.ulloasp.mlsuite.prediction.application.dto.OutputFeedbackDto;
import dev.ulloasp.mlsuite.prediction.application.dto.UpdateExplanationFeedbackParams;
import dev.ulloasp.mlsuite.prediction.application.dto.UpdateOutputFeedbackParams;
import dev.ulloasp.mlsuite.review.application.dto.CreateReviewLinkRequest;
import dev.ulloasp.mlsuite.review.application.dto.ReviewLinkContextDto;
import dev.ulloasp.mlsuite.review.application.dto.ReviewLinkCreateResponse;
import dev.ulloasp.mlsuite.review.application.dto.ReviewLinkSummaryDto;
import dev.ulloasp.mlsuite.review.application.dto.ReviewPredictionDetailDto;
import dev.ulloasp.mlsuite.review.application.dto.SubmitReviewPredictionsRequest;
import dev.ulloasp.mlsuite.review.application.service.ReviewLinkService;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/review-links")
public class ReviewLinkController {

    private final CurrentUserResolver currentUserResolver;
    private final ReviewLinkService reviewLinkService;

    public ReviewLinkController(CurrentUserResolver currentUserResolver, ReviewLinkService reviewLinkService) {
        this.currentUserResolver = currentUserResolver;
        this.reviewLinkService = reviewLinkService;
    }

    @PostMapping
    public ResponseEntity<ReviewLinkCreateResponse> create(
            Authentication authentication,
            @RequestHeader(value = "Origin", required = false) String origin,
            @Valid @RequestBody CreateReviewLinkRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reviewLinkService.create(userId(authentication), request, origin));
    }

    @GetMapping
    public ResponseEntity<List<ReviewLinkSummaryDto>> list(
            Authentication authentication,
            @RequestParam Long modelId,
            @RequestParam Long signatureId) {
        return ResponseEntity.ok(reviewLinkService.list(userId(authentication), modelId, signatureId));
    }

    @PostMapping("/{id}/revoke")
    public ResponseEntity<Void> revoke(Authentication authentication, @PathVariable Long id) {
        reviewLinkService.revoke(userId(authentication), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/token/{token}/context")
    public ResponseEntity<ReviewLinkContextDto> context(Authentication authentication, @PathVariable String token) {
        return ResponseEntity.ok(reviewLinkService.context(userId(authentication), token));
    }

    @GetMapping("/token/{token}/predictions/{predictionId}")
    public ResponseEntity<ReviewPredictionDetailDto> detail(
            Authentication authentication,
            @PathVariable String token,
            @PathVariable Long predictionId) {
        return ResponseEntity.ok(reviewLinkService.detail(userId(authentication), token, predictionId));
    }

    @PostMapping("/token/{token}/output-feedback")
    public ResponseEntity<OutputFeedbackDto> createOutputFeedback(
            Authentication authentication,
            @PathVariable String token,
            @Valid @RequestBody CreateOutputFeedbackParams request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reviewLinkService.createOutputFeedback(userId(authentication), token, request));
    }

    @PatchMapping("/token/{token}/output-feedback")
    public ResponseEntity<OutputFeedbackDto> updateOutputFeedback(
            Authentication authentication,
            @PathVariable String token,
            @Valid @RequestBody UpdateOutputFeedbackParams request) {
        return ResponseEntity.ok(reviewLinkService.updateOutputFeedback(userId(authentication), token, request));
    }

    @PostMapping("/token/{token}/explanation-feedback")
    public ResponseEntity<ExplanationFeedbackDto> createExplanationFeedback(
            Authentication authentication,
            @PathVariable String token,
            @Valid @RequestBody CreateExplanationFeedbackParams request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reviewLinkService.createExplanationFeedback(userId(authentication), token, request));
    }

    @PatchMapping("/token/{token}/explanation-feedback")
    public ResponseEntity<ExplanationFeedbackDto> updateExplanationFeedback(
            Authentication authentication,
            @PathVariable String token,
            @Valid @RequestBody UpdateExplanationFeedbackParams request) {
        return ResponseEntity.ok(reviewLinkService.updateExplanationFeedback(userId(authentication), token, request));
    }

    @PostMapping("/token/{token}/submit")
    public ResponseEntity<Void> submit(
            Authentication authentication,
            @PathVariable String token,
            @Valid @RequestBody SubmitReviewPredictionsRequest request) {
        reviewLinkService.submit(userId(authentication), token, request.predictionIds());
        return ResponseEntity.noContent().build();
    }

    private Long userId(Authentication authentication) {
        return currentUserResolver.resolve(authentication).userId();
    }
}
