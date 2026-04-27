/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.services;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.prediction.entities.OutputFeedback;
import dev.ulloasp.mlsuite.prediction.entities.Prediction;
import dev.ulloasp.mlsuite.prediction.exceptions.OutputFeedbackDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.exceptions.PredictionDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.repositories.OutputFeedbackRepository;
import dev.ulloasp.mlsuite.prediction.repositories.PredictionRepository;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.service.UserLookupService;
import jakarta.transaction.Transactional;

@Service
@Transactional
public class OutputFeedbackServiceImpl implements OutputFeedbackService {

    private final UserLookupService userLookupService;
    private final OutputFeedbackRepository outputFeedbackRepository;
    private final PredictionRepository predictionRepository;
    private final PredictionFeedbackStatusResolver predictionFeedbackStatusResolver;

    public OutputFeedbackServiceImpl(
            UserLookupService userLookupService,
            OutputFeedbackRepository outputFeedbackRepository,
            PredictionRepository predictionRepository,
            PredictionFeedbackStatusResolver predictionFeedbackStatusResolver) {
        this.userLookupService = userLookupService;
        this.outputFeedbackRepository = outputFeedbackRepository;
        this.predictionRepository = predictionRepository;
        this.predictionFeedbackStatusResolver = predictionFeedbackStatusResolver;
    }

    @Override
    public OutputFeedback createOutputFeedback(Long userId, Long organizationId, Long predictionId, int order, JsonNode value) {
        User user = userLookupService.requireById(userId);
        Prediction prediction = predictionRepository.findByIdAndOrganizationId(predictionId, organizationId)
                .orElseThrow(() -> new PredictionDoesNotExistsException(predictionId, user.getUsername()));

        OutputFeedback outputFeedback = new OutputFeedback(prediction, order, value);
        outputFeedback.setOrganization(prediction.getOrganization());
        outputFeedback = outputFeedbackRepository.save(outputFeedback);
        prediction.setStatus(predictionFeedbackStatusResolver.resolve(userId, organizationId, prediction));
        predictionRepository.save(prediction);
        return outputFeedback;
    }

    @Override
    public OutputFeedback updateOutputFeedback(Long userId, Long organizationId, Long outputFeedbackId, JsonNode value) {
        User user = userLookupService.requireById(userId);
        OutputFeedback outputFeedback = outputFeedbackRepository.findByIdAndOrganizationId(outputFeedbackId, organizationId)
                .orElseThrow(() -> new OutputFeedbackDoesNotExistsException(outputFeedbackId, user.getUsername()));

        outputFeedback.setValue(value);
        OutputFeedback saved = outputFeedbackRepository.save(outputFeedback);
        Prediction prediction = saved.getPrediction();
        prediction.setStatus(predictionFeedbackStatusResolver.resolve(userId, organizationId, prediction));
        predictionRepository.save(prediction);
        return saved;
    }

    @Override
    public List<OutputFeedback> getOutputFeedbackByPredictionId(Long userId, Long organizationId, Long predictionId) {
        User user = userLookupService.requireById(userId);
        Optional<Prediction> optionalPrediction = predictionRepository.findByIdAndOrganizationId(predictionId, organizationId);

        if (optionalPrediction.isEmpty()) {
            throw new PredictionDoesNotExistsException(predictionId, user.getUsername());
        }

        return outputFeedbackRepository.findByPredictionIdAndOrganizationId(predictionId, organizationId);
    }

    public OutputFeedback createOutputFeedback(Long userId, Long predictionId, int order, JsonNode value) {
        User user = userLookupService.requireById(userId);
        Prediction prediction = predictionRepository.findByIdAndUserId(predictionId, userId)
                .orElseThrow(() -> new PredictionDoesNotExistsException(predictionId, user.getUsername()));
        OutputFeedback outputFeedback = new OutputFeedback(prediction, order, value);
        outputFeedback.setOrganization(prediction.getOrganization());
        outputFeedback = outputFeedbackRepository.save(outputFeedback);
        prediction.setStatus(predictionFeedbackStatusResolver.resolve(userId, prediction));
        predictionRepository.save(prediction);
        return outputFeedback;
    }

    public OutputFeedback updateOutputFeedback(Long userId, Long outputFeedbackId, JsonNode value) {
        User user = userLookupService.requireById(userId);
        OutputFeedback outputFeedback = outputFeedbackRepository.findByIdAndUserId(outputFeedbackId, userId)
                .orElseThrow(() -> new OutputFeedbackDoesNotExistsException(outputFeedbackId, user.getUsername()));
        outputFeedback.setValue(value);
        OutputFeedback saved = outputFeedbackRepository.save(outputFeedback);
        Prediction prediction = saved.getPrediction();
        prediction.setStatus(predictionFeedbackStatusResolver.resolve(userId, prediction));
        predictionRepository.save(prediction);
        return saved;
    }

    public List<OutputFeedback> getOutputFeedbackByPredictionId(Long userId, Long predictionId) {
        User user = userLookupService.requireById(userId);
        if (predictionRepository.findByIdAndUserId(predictionId, userId).isEmpty()) {
            throw new PredictionDoesNotExistsException(predictionId, user.getUsername());
        }
        return outputFeedbackRepository.findByPredictionIdAndUserId(predictionId, userId);
    }
}
