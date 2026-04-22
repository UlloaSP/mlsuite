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

@Service
public class ExplanationFeedbackServiceImpl implements ExplanationFeedbackService {

    private final UserLookupService userLookupService;
    private final ExplanationFeedbackRepository explanationFeedbackRepository;
    private final PredictionRepository predictionRepository;

    public ExplanationFeedbackServiceImpl(UserLookupService userLookupService,
            ExplanationFeedbackRepository explanationFeedbackRepository, PredictionRepository predictionRepository) {
        this.userLookupService = userLookupService;
        this.explanationFeedbackRepository = explanationFeedbackRepository;
        this.predictionRepository = predictionRepository;
    }

    @Override
    public ExplanationFeedback createExplanationFeedback(Long userId, Long predictionId, int order, JsonNode value) {
        User user = userLookupService.requireById(userId);
        Optional<Prediction> optionalPrediction = predictionRepository.findByIdAndUserId(predictionId, userId);

        if (optionalPrediction.isEmpty()) {
            throw new PredictionDoesNotExistsException(predictionId, user.getUsername());
        }

        ExplanationFeedback explanationFeedback = new ExplanationFeedback(optionalPrediction.get(), order, value);
        return explanationFeedbackRepository.save(explanationFeedback);
    }

    @Override
    public ExplanationFeedback updateExplanationFeedback(Long userId, Long explanationFeedbackId, JsonNode realValue) {
        User user = userLookupService.requireById(userId);
        Optional<ExplanationFeedback> optionalExplanationFeedback = explanationFeedbackRepository
                .findByIdAndUserId(explanationFeedbackId, userId);

        if (optionalExplanationFeedback.isEmpty()) {
            throw new ExplanationFeedbackDoesNotExistsException(explanationFeedbackId, user.getUsername());
        }

        ExplanationFeedback explanationFeedback = optionalExplanationFeedback.get();
        explanationFeedback.setRealValue(realValue);
        return explanationFeedbackRepository.save(explanationFeedback);
    }

    @Override
    public List<ExplanationFeedback> getExplanationFeedbackByPredictionId(Long userId, Long predictionId) {
        User user = userLookupService.requireById(userId);
        Optional<Prediction> optionalPrediction = predictionRepository.findByIdAndUserId(predictionId, userId);

        if (optionalPrediction.isEmpty()) {
            throw new PredictionDoesNotExistsException(predictionId, user.getUsername());
        }

        return explanationFeedbackRepository.findByPredictionIdAndUserId(predictionId, userId);
    }
}
