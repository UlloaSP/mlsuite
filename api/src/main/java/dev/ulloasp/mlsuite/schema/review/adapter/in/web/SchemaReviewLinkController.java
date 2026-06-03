package dev.ulloasp.mlsuite.schema.review.adapter.in.web;

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

import dev.ulloasp.mlsuite.schema.application.dto.CreatePredictionResultFeedbackRequest;
import dev.ulloasp.mlsuite.schema.application.dto.PredictionResultFeedbackDto;
import dev.ulloasp.mlsuite.schema.application.dto.UpdatePredictionResultFeedbackRequest;
import dev.ulloasp.mlsuite.schema.review.application.dto.CreateSchemaReviewLinkRequest;
import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewLinkContextDto;
import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewLinkCreateResponse;
import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewLinkSummaryDto;
import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewRunDetailDto;
import dev.ulloasp.mlsuite.schema.review.application.dto.SubmitSchemaReviewRunsRequest;
import dev.ulloasp.mlsuite.schema.review.application.service.SchemaReviewLinkService;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/schema-review-links")
public class SchemaReviewLinkController {
    private final CurrentUserResolver currentUserResolver;
    private final SchemaReviewLinkService service;

    public SchemaReviewLinkController(CurrentUserResolver currentUserResolver, SchemaReviewLinkService service) {
        this.currentUserResolver = currentUserResolver;
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<SchemaReviewLinkCreateResponse> create(
            Authentication authentication,
            @RequestHeader(value = "Origin", required = false) String origin,
            @Valid @RequestBody CreateSchemaReviewLinkRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(userId(authentication), request, origin));
    }

    @GetMapping
    public ResponseEntity<List<SchemaReviewLinkSummaryDto>> list(
            Authentication authentication,
            @RequestParam Long schemaId,
            @RequestParam Long versionId) {
        return ResponseEntity.ok(service.list(userId(authentication), schemaId, versionId));
    }

    @PostMapping("/{id}/revoke")
    public ResponseEntity<Void> revoke(Authentication authentication, @PathVariable Long id) {
        service.revoke(userId(authentication), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/token/{token}/context")
    public ResponseEntity<SchemaReviewLinkContextDto> context(Authentication authentication, @PathVariable String token) {
        return ResponseEntity.ok(service.context(userId(authentication), token));
    }

    @GetMapping("/token/{token}/runs/{runToken}")
    public ResponseEntity<SchemaReviewRunDetailDto> detail(
            Authentication authentication,
            @PathVariable String token,
            @PathVariable String runToken) {
        return ResponseEntity.ok(service.detail(userId(authentication), token, runToken));
    }

    @PostMapping("/token/{token}/feedback")
    public ResponseEntity<PredictionResultFeedbackDto> createFeedback(
            Authentication authentication,
            @PathVariable String token,
            @Valid @RequestBody CreatePredictionResultFeedbackRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createFeedback(userId(authentication), token, request));
    }

    @PatchMapping("/token/{token}/feedback")
    public ResponseEntity<PredictionResultFeedbackDto> updateFeedback(
            Authentication authentication,
            @PathVariable String token,
            @Valid @RequestBody UpdatePredictionResultFeedbackRequest request) {
        return ResponseEntity.ok(service.updateFeedback(userId(authentication), token, request));
    }

    @PostMapping("/token/{token}/submit")
    public ResponseEntity<Void> submit(
            Authentication authentication,
            @PathVariable String token,
            @Valid @RequestBody SubmitSchemaReviewRunsRequest request) {
        service.submit(userId(authentication), token, request.runTokens());
        return ResponseEntity.noContent().build();
    }

    private Long userId(Authentication authentication) {
        return currentUserResolver.resolve(authentication).userId();
    }
}
