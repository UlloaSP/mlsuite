/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.application.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.prediction.domain.model.ExplanationFeedback;
import dev.ulloasp.mlsuite.prediction.domain.model.Prediction;
import dev.ulloasp.mlsuite.prediction.domain.exception.ExplanationFeedbackDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.domain.exception.PredictionDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.adapter.out.persistence.repository.ExplanationFeedbackRepository;
import dev.ulloasp.mlsuite.prediction.adapter.out.persistence.repository.PredictionRepository;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import jakarta.transaction.Transactional;

@Service
@Transactional
public class ExplanationFeedbackServiceImpl implements ExplanationFeedbackService {

    private final UserLookupService userLookupService;
    private final ExplanationFeedbackRepository explanationFeedbackRepository;
    private final PredictionRepository predictionRepository;
    private final PredictionFeedbackStatusResolver predictionFeedbackStatusResolver;
    private final WorkspaceAccessService workspaceAccessService;

    public ExplanationFeedbackServiceImpl(UserLookupService userLookupService,
            ExplanationFeedbackRepository explanationFeedbackRepository,
            PredictionRepository predictionRepository,
            PredictionFeedbackStatusResolver predictionFeedbackStatusResolver,
            WorkspaceAccessService workspaceAccessService) {
        this.userLookupService = userLookupService;
        this.explanationFeedbackRepository = explanationFeedbackRepository;
        this.predictionRepository = predictionRepository;
        this.predictionFeedbackStatusResolver = predictionFeedbackStatusResolver;
        this.workspaceAccessService = workspaceAccessService;
    }

    @Override
    public ExplanationFeedback createExplanationFeedback(Long userId, Long predictionId, int order, JsonNode value) {
        User user = userLookupService.requireById(userId);
        Long organizationId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        Optional<Prediction> optionalPrediction = predictionRepository.findByIdAndOrganizationId(predictionId, organizationId);

        if (optionalPrediction.isEmpty()) {
            throw new PredictionDoesNotExistsException(predictionId, user.getUsername());
        }

        ExplanationFeedback explanationFeedback = new ExplanationFeedback(optionalPrediction.get(), user, order, value);
        ExplanationFeedback saved = explanationFeedbackRepository.save(explanationFeedback);
        Prediction prediction = saved.getPrediction();
        prediction.setStatus(predictionFeedbackStatusResolver.resolve(userId, prediction));
        predictionRepository.save(prediction);
        return saved;
    }

    @Override
    public ExplanationFeedback updateExplanationFeedback(Long userId, Long explanationFeedbackId, JsonNode realValue) {
        User user = userLookupService.requireById(userId);
        Long organizationId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        Optional<ExplanationFeedback> optionalExplanationFeedback = explanationFeedbackRepository
                .findByIdAndOrganizationId(explanationFeedbackId, organizationId);

        if (optionalExplanationFeedback.isEmpty()) {
            throw new ExplanationFeedbackDoesNotExistsException(explanationFeedbackId, user.getUsername());
        }

        ExplanationFeedback explanationFeedback = optionalExplanationFeedback.get();
        explanationFeedback.setRealValue(realValue);
        ExplanationFeedback saved = explanationFeedbackRepository.save(explanationFeedback);
        Prediction prediction = saved.getPrediction();
        prediction.setStatus(predictionFeedbackStatusResolver.resolve(userId, prediction));
        predictionRepository.save(prediction);
        return saved;
    }

    @Override
    public List<ExplanationFeedback> getExplanationFeedbackByPredictionId(Long userId, Long predictionId) {
        User user = userLookupService.requireById(userId);
        Long organizationId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        Optional<Prediction> optionalPrediction = predictionRepository.findByIdAndOrganizationId(predictionId, organizationId);

        if (optionalPrediction.isEmpty()) {
            throw new PredictionDoesNotExistsException(predictionId, user.getUsername());
        }

        return explanationFeedbackRepository.findPublishedByPredictionIdAndOrganizationId(predictionId, organizationId);
    }
}

