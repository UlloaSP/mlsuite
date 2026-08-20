package dev.ulloasp.mlsuite.schema.review.application.port.in;

import java.util.List;

import dev.ulloasp.mlsuite.schema.application.dto.CreatePredictionResultFeedbackRequest;
import dev.ulloasp.mlsuite.schema.application.dto.PredictionResultFeedbackDto;
import dev.ulloasp.mlsuite.schema.application.dto.UpdatePredictionResultFeedbackRequest;
import dev.ulloasp.mlsuite.schema.review.application.dto.CreateSchemaReviewRequest;
import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewContextDto;
import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewRunDetailDto;
import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewReviewerDto;

public interface SchemaReviewUseCase {
    void create(Long userId, CreateSchemaReviewRequest request);

    List<SchemaReviewContextDto> inbox(Long userId);

    List<SchemaReviewReviewerDto> eligibleReviewers(Long userId);

    SchemaReviewRunDetailDto detail(Long userId, String publicId, String reviewRunId);

    PredictionResultFeedbackDto createFeedback(Long userId, String publicId, String reviewRunId,
            CreatePredictionResultFeedbackRequest request);

    PredictionResultFeedbackDto updateFeedback(Long userId, String publicId, String reviewRunId,
            UpdatePredictionResultFeedbackRequest request);

    void submit(Long userId, String publicId, List<String> reviewRunIds);
}
