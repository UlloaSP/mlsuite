package dev.ulloasp.mlsuite.review.application.service;

import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.prediction.adapter.out.persistence.repository.ExplanationFeedbackRepository;
import dev.ulloasp.mlsuite.prediction.adapter.out.persistence.repository.OutputFeedbackRepository;
import dev.ulloasp.mlsuite.prediction.adapter.out.persistence.repository.PredictionRepository;
import dev.ulloasp.mlsuite.prediction.adapter.out.persistence.repository.TargetRepository;
import dev.ulloasp.mlsuite.prediction.application.service.PredictionFeedbackStatusResolver;
import dev.ulloasp.mlsuite.review.adapter.out.persistence.repository.ReviewLinkPredictionRepository;
import dev.ulloasp.mlsuite.review.adapter.out.persistence.repository.ReviewLinkPredictionSubmissionRepository;
import dev.ulloasp.mlsuite.review.adapter.out.persistence.repository.ReviewLinkRepository;
import dev.ulloasp.mlsuite.signature.adapter.out.persistence.repository.SignatureRepository;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@Component
public record ReviewLinkDependencies(
        ReviewLinkRepository linkRepository,
        ReviewLinkPredictionRepository linkPredictionRepository,
        ReviewLinkPredictionSubmissionRepository submissionRepository,
        ReviewLinkTokenService tokenService,
        WorkspaceAccessService workspaceAccessService,
        WorkspaceAuthorizationService authorizationService,
        UserLookupService userLookupService,
        ModelRepository modelRepository,
        SignatureRepository signatureRepository,
        PredictionRepository predictionRepository,
        TargetRepository targetRepository,
        OutputFeedbackRepository outputFeedbackRepository,
        ExplanationFeedbackRepository explanationFeedbackRepository,
        PredictionFeedbackStatusResolver feedbackStatusResolver) {
}
