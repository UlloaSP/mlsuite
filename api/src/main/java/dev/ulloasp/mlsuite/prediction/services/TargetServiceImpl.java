/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.services;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.prediction.entities.Prediction;
import dev.ulloasp.mlsuite.prediction.entities.Target;
import dev.ulloasp.mlsuite.prediction.exceptions.PredictionDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.exceptions.TargetDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.repositories.PredictionRepository;
import dev.ulloasp.mlsuite.prediction.repositories.TargetRepository;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.service.UserLookupService;

@Service
public class TargetServiceImpl implements TargetService {

    private final UserLookupService userLookupService;
    private final TargetRepository targetRepository;
    private final PredictionRepository predictionRepository;

    public TargetServiceImpl(UserLookupService userLookupService, TargetRepository targetRepository,
            PredictionRepository predictionRepository) {
        this.userLookupService = userLookupService;
        this.targetRepository = targetRepository;
        this.predictionRepository = predictionRepository;
    }

    @Override
    public Target createTarget(Long userId, Long predictionId, int order,
            JsonNode value) {
        User user = userLookupService.requireById(userId);

        Optional<Prediction> optionalPrediction = predictionRepository.findByIdAndUserId(predictionId, userId);

        if (optionalPrediction.isEmpty()) {
            throw new PredictionDoesNotExistsException(predictionId, user.getUsername());
        }

        Prediction prediction = optionalPrediction.get();

        Target target = new Target(prediction, order, value);

        return this.targetRepository.save(target);
    }

    @Override
    public Target updateTarget(Long userId, Long targetId, JsonNode realValue) {
        User user = userLookupService.requireById(userId);

        Optional<Target> optionalTarget = targetRepository.findByIdAndUserId(targetId, userId);

        if (optionalTarget.isEmpty()) {
            throw new TargetDoesNotExistsException(targetId, user.getUsername());
        }

        Target target = optionalTarget.get();
        target.setRealValue(realValue);

        return targetRepository.save(target);
    }

    @Override
    public List<Target> getTargetsByPredictionId(Long userId, Long predictionId) {
        User user = userLookupService.requireById(userId);

        Optional<Prediction> optionalPrediction = predictionRepository.findByIdAndUserId(predictionId, userId);

        if (optionalPrediction.isEmpty()) {
            throw new PredictionDoesNotExistsException(predictionId, user.getUsername());
        }

        return targetRepository.findByPredictionIdAndUserId(predictionId, userId);
    }

}
