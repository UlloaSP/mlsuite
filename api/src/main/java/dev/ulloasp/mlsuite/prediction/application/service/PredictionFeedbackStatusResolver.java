/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.application.service;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import dev.ulloasp.mlsuite.prediction.domain.model.Prediction;
import dev.ulloasp.mlsuite.prediction.domain.model.PredictionStatus;
import dev.ulloasp.mlsuite.prediction.adapter.out.persistence.repository.ExplanationFeedbackRepository;
import dev.ulloasp.mlsuite.prediction.adapter.out.persistence.repository.OutputFeedbackRepository;

@Service
public class PredictionFeedbackStatusResolver {

    private final OutputFeedbackRepository outputFeedbackRepository;
    private final ExplanationFeedbackRepository explanationFeedbackRepository;

    public PredictionFeedbackStatusResolver(
            OutputFeedbackRepository outputFeedbackRepository,
            ExplanationFeedbackRepository explanationFeedbackRepository) {
        this.outputFeedbackRepository = outputFeedbackRepository;
        this.explanationFeedbackRepository = explanationFeedbackRepository;
    }

    public PredictionStatus resolve(Long userId, Prediction prediction) {
        int requiredOutputs = countReports(prediction.getSignature().getInputSignature());
        int requiredExplanations = countFeedbackEnabledExplanations(userId, prediction.getSignature().getInputSignature());
        int savedOutputs = outputFeedbackRepository.findByPredictionIdAndUserId(prediction.getId(), userId).size();
        int savedExplanations = explanationFeedbackRepository.findByPredictionIdAndUserId(prediction.getId(), userId).size();

        return savedOutputs >= requiredOutputs && savedExplanations >= requiredExplanations
                ? PredictionStatus.COMPLETED
                : PredictionStatus.PENDING;
    }

    private int countReports(Map<String, Object> inputSignature) {
        Object reports = inputSignature.get("reports");
        return reports instanceof List<?> items ? items.size() : 0;
    }

    private int countFeedbackEnabledExplanations(Long userId, Map<String, Object> inputSignature) {
        Object rawExplanations = inputSignature.get("explanations");
        if (!(rawExplanations instanceof List<?> items)) {
            return 0;
        }

        return (int) items.stream()
                .filter((item) -> item instanceof Map<?, ?>)
                .map((item) -> (Map<?, ?>) item)
                .filter(this::isFeedbackEnabled)
                .count();
    }

    private boolean isFeedbackEnabled(Map<?, ?> explanation) {
        Object explicit = explanation.get("feedbackEnabled");
        if (explicit instanceof Boolean enabled) {
            return enabled;
        }
        return explanation.get("feedbackQuestionnaire") != null;
    }
}
