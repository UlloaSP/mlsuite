/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.services;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;

import dev.ulloasp.mlsuite.plugin.dtos.PluginDto;
import dev.ulloasp.mlsuite.plugin.services.PluginService;
import dev.ulloasp.mlsuite.prediction.entities.Prediction;
import dev.ulloasp.mlsuite.prediction.entities.PredictionStatus;
import dev.ulloasp.mlsuite.prediction.repositories.ExplanationFeedbackRepository;
import dev.ulloasp.mlsuite.prediction.repositories.OutputFeedbackRepository;

@Service
public class PredictionFeedbackStatusResolver {

    private static final Pattern KIND_PATTERN = Pattern.compile("\\bkind\\s*:\\s*[\"']([^\"']+)[\"']");

    private final OutputFeedbackRepository outputFeedbackRepository;
    private final ExplanationFeedbackRepository explanationFeedbackRepository;
    private final PluginService pluginService;

    public PredictionFeedbackStatusResolver(
            OutputFeedbackRepository outputFeedbackRepository,
            ExplanationFeedbackRepository explanationFeedbackRepository,
            PluginService pluginService) {
        this.outputFeedbackRepository = outputFeedbackRepository;
        this.explanationFeedbackRepository = explanationFeedbackRepository;
        this.pluginService = pluginService;
    }

    public PredictionStatus resolve(Long userId, Long organizationId, Prediction prediction) {
        int requiredOutputs = countReports(prediction.getSignature().getInputSignature());
        int requiredExplanations = countFeedbackEnabledExplanations(userId, organizationId,
                prediction.getSignature().getInputSignature());
        int savedOutputs = outputFeedbackRepository.findByPredictionId(prediction.getId()).size();
        int savedExplanations = explanationFeedbackRepository.findByPredictionId(prediction.getId()).size();

        return savedOutputs >= requiredOutputs && savedExplanations >= requiredExplanations
                ? PredictionStatus.COMPLETED
                : PredictionStatus.PENDING;
    }

    private int countReports(Map<String, Object> inputSignature) {
        Object reports = inputSignature.get("reports");
        return reports instanceof List<?> items ? items.size() : 0;
    }

    private int countFeedbackEnabledExplanations(Long userId, Long organizationId, Map<String, Object> inputSignature) {
        Object rawExplanations = inputSignature.get("explanations");
        if (!(rawExplanations instanceof List<?> items)) {
            return 0;
        }

        Set<String> pluginKindsWithFeedback = pluginService.list(userId, organizationId).stream()
                .map(this::detectFeedbackExplanationKind)
                .flatMap(Optional::stream)
                .collect(java.util.stream.Collectors.toSet());

        return (int) items.stream()
                .filter((item) -> item instanceof Map<?, ?>)
                .map((item) -> (Map<?, ?>) item)
                .filter((item) -> isFeedbackEnabled(item, pluginKindsWithFeedback))
                .count();
    }

    public PredictionStatus resolve(Long userId, Prediction prediction) {
        return resolve(userId, userId, prediction);
    }

    private boolean isFeedbackEnabled(Map<?, ?> explanation, Set<String> feedbackKinds) {
        Object explicit = explanation.get("feedbackEnabled");
        if (explicit instanceof Boolean enabled) {
            return enabled;
        }

        Object rawKind = explanation.get("kind");
        return rawKind instanceof String kind && feedbackKinds.contains(kind);
    }

    private Optional<String> detectFeedbackExplanationKind(PluginDto plugin) {
        String source = plugin.source();
        if (!source.contains("defineExplanationKind(") || !source.contains("feedbackQuestionnaire")) {
            return Optional.empty();
        }

        Matcher matcher = KIND_PATTERN.matcher(source);
        return matcher.find() ? Optional.of(matcher.group(1)) : Optional.empty();
    }
}
