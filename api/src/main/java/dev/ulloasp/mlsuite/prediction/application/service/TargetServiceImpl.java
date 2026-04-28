/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.application.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.prediction.domain.model.Prediction;
import dev.ulloasp.mlsuite.prediction.domain.model.Target;
import dev.ulloasp.mlsuite.prediction.domain.exception.PredictionDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.domain.exception.TargetDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.adapter.out.persistence.repository.PredictionRepository;
import dev.ulloasp.mlsuite.prediction.adapter.out.persistence.repository.TargetRepository;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import jakarta.transaction.Transactional;

@Service
@Transactional
public class TargetServiceImpl implements TargetService {

    private final UserLookupService userLookupService;
    private final TargetRepository targetRepository;
    private final PredictionRepository predictionRepository;
    private final WorkspaceAccessService workspaceAccessService;

    public TargetServiceImpl(UserLookupService userLookupService, TargetRepository targetRepository,
            PredictionRepository predictionRepository, WorkspaceAccessService workspaceAccessService) {
        this.userLookupService = userLookupService;
        this.targetRepository = targetRepository;
        this.predictionRepository = predictionRepository;
        this.workspaceAccessService = workspaceAccessService;
    }

    @Override
    public Target createTarget(Long userId, Long predictionId, int order,
            JsonNode value) {
        User user = userLookupService.requireById(userId);
        Long organizationId = workspaceAccessService.requireCurrentOrganization(userId).getId();

        Optional<Prediction> optionalPrediction = predictionRepository.findByIdAndOrganizationId(predictionId, organizationId);

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

        Long organizationId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        Optional<Target> optionalTarget = targetRepository.findByIdAndOrganizationId(targetId, organizationId);

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

        Long organizationId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        Optional<Prediction> optionalPrediction = predictionRepository.findByIdAndOrganizationId(predictionId, organizationId);

        if (optionalPrediction.isEmpty()) {
            throw new PredictionDoesNotExistsException(predictionId, user.getUsername());
        }

        return targetRepository.findByPredictionIdAndOrganizationId(predictionId, organizationId);
    }
}

