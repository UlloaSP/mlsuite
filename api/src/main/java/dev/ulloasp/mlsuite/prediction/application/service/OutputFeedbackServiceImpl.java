/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.application.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.prediction.domain.model.OutputFeedback;
import dev.ulloasp.mlsuite.prediction.domain.model.Prediction;
import dev.ulloasp.mlsuite.prediction.domain.exception.OutputFeedbackDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.domain.exception.PredictionDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.adapter.out.persistence.repository.OutputFeedbackRepository;
import dev.ulloasp.mlsuite.prediction.adapter.out.persistence.repository.PredictionRepository;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import jakarta.transaction.Transactional;

@Service
@Transactional
public class OutputFeedbackServiceImpl implements OutputFeedbackService {

    private final UserLookupService userLookupService;
    private final OutputFeedbackRepository outputFeedbackRepository;
    private final PredictionRepository predictionRepository;
    private final PredictionFeedbackStatusResolver predictionFeedbackStatusResolver;
    private final DirectFeedbackPublicationService publicationService;
    private final WorkspaceAccessService workspaceAccessService;

    public OutputFeedbackServiceImpl(
            UserLookupService userLookupService,
            OutputFeedbackRepository outputFeedbackRepository,
            PredictionRepository predictionRepository,
            PredictionFeedbackStatusResolver predictionFeedbackStatusResolver,
            DirectFeedbackPublicationService publicationService,
            WorkspaceAccessService workspaceAccessService) {
        this.userLookupService = userLookupService;
        this.outputFeedbackRepository = outputFeedbackRepository;
        this.predictionRepository = predictionRepository;
        this.predictionFeedbackStatusResolver = predictionFeedbackStatusResolver;
        this.publicationService = publicationService;
        this.workspaceAccessService = workspaceAccessService;
    }

    @Override
    public OutputFeedback createOutputFeedback(Long userId, Long predictionId, int order, JsonNode value) {
        User user = userLookupService.requireById(userId);
        Long organizationId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        Prediction prediction = predictionRepository.findByIdAndOrganizationId(predictionId, organizationId)
                .orElseThrow(() -> new PredictionDoesNotExistsException(predictionId, user.getUsername()));

        OutputFeedback outputFeedback = outputFeedbackRepository
                .findByPredictionIdAndUserIdAndOrder(predictionId, userId, order)
                .orElseGet(() -> new OutputFeedback(prediction, user, order, value));
        outputFeedback.setValue(value);
        OutputFeedback saved = outputFeedbackRepository.save(outputFeedback);
        publicationService.publish(user, prediction);
        prediction.setStatus(predictionFeedbackStatusResolver.resolve(userId, prediction));
        predictionRepository.save(prediction);
        return saved;
    }

    @Override
    public OutputFeedback updateOutputFeedback(Long userId, Long outputFeedbackId, JsonNode value) {
        User user = userLookupService.requireById(userId);
        Long organizationId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        OutputFeedback outputFeedback = outputFeedbackRepository.findByIdAndOrganizationId(outputFeedbackId, organizationId)
                .orElseThrow(() -> new OutputFeedbackDoesNotExistsException(outputFeedbackId, user.getUsername()));

        outputFeedback.setValue(value);
        OutputFeedback saved = outputFeedbackRepository.save(outputFeedback);
        Prediction prediction = saved.getPrediction();
        publicationService.publish(user, prediction);
        prediction.setStatus(predictionFeedbackStatusResolver.resolve(userId, prediction));
        predictionRepository.save(prediction);
        return saved;
    }

    @Override
    public List<OutputFeedback> getOutputFeedbackByPredictionId(Long userId, Long predictionId) {
        User user = userLookupService.requireById(userId);
        Long organizationId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        Optional<Prediction> optionalPrediction = predictionRepository.findByIdAndOrganizationId(predictionId, organizationId);

        if (optionalPrediction.isEmpty()) {
            throw new PredictionDoesNotExistsException(predictionId, user.getUsername());
        }

        return outputFeedbackRepository.findPublishedByPredictionIdAndOrganizationId(predictionId, organizationId);
    }
}

