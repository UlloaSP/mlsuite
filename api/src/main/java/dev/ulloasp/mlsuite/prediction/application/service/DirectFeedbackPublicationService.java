package dev.ulloasp.mlsuite.prediction.application.service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import org.springframework.stereotype.Service;

import dev.ulloasp.mlsuite.prediction.domain.model.Prediction;
import dev.ulloasp.mlsuite.review.adapter.out.persistence.repository.ReviewLinkPredictionRepository;
import dev.ulloasp.mlsuite.review.adapter.out.persistence.repository.ReviewLinkPredictionSubmissionRepository;
import dev.ulloasp.mlsuite.review.domain.model.ReviewLinkPredictionSubmission;
import dev.ulloasp.mlsuite.user.domain.model.User;

@Service
public class DirectFeedbackPublicationService {

    private final ReviewLinkPredictionRepository linkPredictionRepository;
    private final ReviewLinkPredictionSubmissionRepository submissionRepository;

    public DirectFeedbackPublicationService(
            ReviewLinkPredictionRepository linkPredictionRepository,
            ReviewLinkPredictionSubmissionRepository submissionRepository) {
        this.linkPredictionRepository = linkPredictionRepository;
        this.submissionRepository = submissionRepository;
    }

    public void publish(User user, Prediction prediction) {
        linkPredictionRepository.findByPredictionId(prediction.getId()).forEach(selection ->
                submissionRepository.findByReviewLinkPredictionIdAndUserId(selection.getId(), user.getId())
                        .orElseGet(() -> submissionRepository.save(new ReviewLinkPredictionSubmission(
                                selection,
                                user,
                                OffsetDateTime.now(ZoneOffset.UTC)))));
    }
}
