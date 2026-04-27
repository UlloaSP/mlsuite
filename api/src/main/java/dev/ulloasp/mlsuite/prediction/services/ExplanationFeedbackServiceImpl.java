/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.services;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.prediction.entities.ExplanationFeedback;
import dev.ulloasp.mlsuite.prediction.entities.Prediction;
import dev.ulloasp.mlsuite.prediction.exceptions.ExplanationFeedbackDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.exceptions.PredictionDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.repositories.ExplanationFeedbackRepository;
import dev.ulloasp.mlsuite.prediction.repositories.PredictionRepository;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.service.UserLookupService;
import jakarta.transaction.Transactional;

@Service
@Transactional
public class ExplanationFeedbackServiceImpl implements ExplanationFeedbackService {

    private final UserLookupService userLookupService;
    private final ExplanationFeedbackRepository explanationFeedbackRepository;
    private final PredictionRepository predictionRepository;
    private final PredictionFeedbackStatusResolver predictionFeedbackStatusResolver;

    public ExplanationFeedbackServiceImpl(UserLookupService userLookupService,
            ExplanationFeedbackRepository explanationFeedbackRepository,
            PredictionRepository predictionRepository,
            PredictionFeedbackStatusResolver predictionFeedbackStatusResolver) {
        this.userLookupService = userLookupService;
        this.explanationFeedbackRepository = explanationFeedbackRepository;
        this.predictionRepository = predictionRepository;
        this.predictionFeedbackStatusResolver = predictionFeedbackStatusResolver;
    }

    @Override
    public ExplanationFeedback createExplanationFeedback(Long userId, Long organizationId, Long predictionId, int order, JsonNode value) {
        User user = userLookupService.requireById(userId);
        Optional<Prediction> optionalPrediction = predictionRepository.findByIdAndOrganizationId(predictionId, organizationId);

        if (optionalPrediction.isEmpty()) {
            throw new PredictionDoesNotExistsException(predictionId, user.getUsername());
        }

        ExplanationFeedback explanationFeedback = new ExplanationFeedback(optionalPrediction.get(), order, value);
        explanationFeedback.setOrganization(optionalPrediction.get().getOrganization());
        ExplanationFeedback saved = explanationFeedbackRepository.save(explanationFeedback);
        Prediction prediction = saved.getPrediction();
        prediction.setStatus(predictionFeedbackStatusResolver.resolve(userId, organizationId, prediction));
        predictionRepository.save(prediction);
        return saved;
    }

    @Override
    public ExplanationFeedback updateExplanationFeedback(Long userId, Long organizationId, Long explanationFeedbackId, JsonNode realValue) {
        User user = userLookupService.requireById(userId);
        Optional<ExplanationFeedback> optionalExplanationFeedback = explanationFeedbackRepository
                .findByIdAndOrganizationId(explanationFeedbackId, organizationId);

        if (optionalExplanationFeedback.isEmpty()) {
            throw new ExplanationFeedbackDoesNotExistsException(explanationFeedbackId, user.getUsername());
        }

        ExplanationFeedback explanationFeedback = optionalExplanationFeedback.get();
        explanationFeedback.setRealValue(realValue);
        ExplanationFeedback saved = explanationFeedbackRepository.save(explanationFeedback);
        Prediction prediction = saved.getPrediction();
        prediction.setStatus(predictionFeedbackStatusResolver.resolve(userId, organizationId, prediction));
        predictionRepository.save(prediction);
        return saved;
    }

    @Override
    public List<ExplanationFeedback> getExplanationFeedbackByPredictionId(Long userId, Long organizationId, Long predictionId) {
        User user = userLookupService.requireById(userId);
        Optional<Prediction> optionalPrediction = predictionRepository.findByIdAndOrganizationId(predictionId, organizationId);

        if (optionalPrediction.isEmpty()) {
            throw new PredictionDoesNotExistsException(predictionId, user.getUsername());
        }

        return explanationFeedbackRepository.findByPredictionIdAndOrganizationId(predictionId, organizationId);
    }

    public ExplanationFeedback createExplanationFeedback(Long userId, Long predictionId, int order, JsonNode value) {
        User user = userLookupService.requireById(userId);
        Prediction prediction = predictionRepository.findByIdAndUserId(predictionId, userId)
                .orElseThrow(() -> new PredictionDoesNotExistsException(predictionId, user.getUsername()));
        ExplanationFeedback explanationFeedback = new ExplanationFeedback(prediction, order, value);
        explanationFeedback.setOrganization(prediction.getOrganization());
        ExplanationFeedback saved = explanationFeedbackRepository.save(explanationFeedback);
        prediction.setStatus(predictionFeedbackStatusResolver.resolve(userId, prediction));
        predictionRepository.save(prediction);
        return saved;
    }

    public ExplanationFeedback updateExplanationFeedback(Long userId, Long explanationFeedbackId, JsonNode realValue) {
        User user = userLookupService.requireById(userId);
        ExplanationFeedback explanationFeedback = explanationFeedbackRepository.findByIdAndUserId(explanationFeedbackId, userId)
                .orElseThrow(() -> new ExplanationFeedbackDoesNotExistsException(explanationFeedbackId, user.getUsername()));
        explanationFeedback.setRealValue(realValue);
        ExplanationFeedback saved = explanationFeedbackRepository.save(explanationFeedback);
        Prediction prediction = saved.getPrediction();
        prediction.setStatus(predictionFeedbackStatusResolver.resolve(userId, prediction));
        predictionRepository.save(prediction);
        return saved;
    }

    public List<ExplanationFeedback> getExplanationFeedbackByPredictionId(Long userId, Long predictionId) {
        User user = userLookupService.requireById(userId);
        if (predictionRepository.findByIdAndUserId(predictionId, userId).isEmpty()) {
            throw new PredictionDoesNotExistsException(predictionId, user.getUsername());
        }
        return explanationFeedbackRepository.findByPredictionIdAndUserId(predictionId, userId);
    }
}
