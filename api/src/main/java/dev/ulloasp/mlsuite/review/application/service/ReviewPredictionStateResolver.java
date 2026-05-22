package dev.ulloasp.mlsuite.review.application.service;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.prediction.adapter.out.persistence.repository.ExplanationFeedbackRepository;
import dev.ulloasp.mlsuite.prediction.adapter.out.persistence.repository.OutputFeedbackRepository;
import dev.ulloasp.mlsuite.prediction.domain.model.ExplanationFeedback;
import dev.ulloasp.mlsuite.prediction.domain.model.OutputFeedback;

class ReviewPredictionStateResolver {

    private final OutputFeedbackRepository outputFeedbackRepository;
    private final ExplanationFeedbackRepository explanationFeedbackRepository;

    ReviewPredictionStateResolver(
            OutputFeedbackRepository outputFeedbackRepository,
            ExplanationFeedbackRepository explanationFeedbackRepository) {
        this.outputFeedbackRepository = outputFeedbackRepository;
        this.explanationFeedbackRepository = explanationFeedbackRepository;
    }

    OffsetDateTime revisionEnteredAt(Long userId, Long predictionId) {
        OffsetDateTime enteredAt = null;
        for (OutputFeedback feedback : outputFeedbackRepository.findByPredictionIdAndUserId(predictionId, userId)) {
            enteredAt = earlier(enteredAt, feedback.getCreatedAt());
        }
        for (ExplanationFeedback feedback : explanationFeedbackRepository.findByPredictionIdAndUserId(predictionId, userId)) {
            enteredAt = earlier(enteredAt, feedback.getCreatedAt());
        }
        return enteredAt;
    }

    private OffsetDateTime earlier(OffsetDateTime current, OffsetDateTime candidate) {
        if (candidate == null) {
            return current;
        }
        return current == null || candidate.isBefore(current) ? candidate : current;
    }
}
