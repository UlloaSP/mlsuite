/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.services;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;

import dev.ulloasp.mlsuite.prediction.entities.Prediction;
import dev.ulloasp.mlsuite.prediction.entities.PredictionStatus;
import dev.ulloasp.mlsuite.prediction.exceptions.PredictionAlreadyExistsException;
import dev.ulloasp.mlsuite.prediction.exceptions.PredictionDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.repositories.PredictionRepository;
import dev.ulloasp.mlsuite.signature.entities.Signature;
import dev.ulloasp.mlsuite.signature.exceptions.SignatureDoesNotExistsException;
import dev.ulloasp.mlsuite.signature.repositories.SignatureRepository;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.service.UserLookupService;
import jakarta.transaction.Transactional;

@Service
@Transactional
public class PredictionServiceImpl implements PredictionService {

    private final UserLookupService userLookupService;
    private final SignatureRepository signatureRepository;
    private final PredictionRepository predictionRepository;

    public PredictionServiceImpl(UserLookupService userLookupService, SignatureRepository signatureRepository,
            PredictionRepository predictionRepository) {
        this.userLookupService = userLookupService;
        this.signatureRepository = signatureRepository;
        this.predictionRepository = predictionRepository;
    }

    @Override
    public Prediction createPrediction(Long userId, Long signatureId, String name,
            Map<String, Object> prediction, Map<String, Object> data) {
        User user = userLookupService.requireById(userId);

        Optional<Signature> optionalSignature = signatureRepository.findByIdAndUserId(signatureId, user.getId());

        if (optionalSignature.isEmpty()) {
            throw new SignatureDoesNotExistsException(signatureId);
        }

        Signature signature = optionalSignature.get();

        if (predictionRepository.existsBySignatureIdAndName(signature.getId(), name)) {
            throw new PredictionAlreadyExistsException(name, signature.getName());
        }

        Prediction pred = new Prediction(signature, name, data, prediction);

        return predictionRepository.save(pred);

    }

    @Override
    public Prediction updatePrediction(Long userId, Long predictionId,
            PredictionStatus status) {
        User user = userLookupService.requireById(userId);
        Optional<Prediction> optionalPrediction = predictionRepository.findByIdAndUserId(predictionId, userId);

        if (optionalPrediction.isEmpty()) {
            throw new PredictionDoesNotExistsException(predictionId, user.getUsername());
        }

        Prediction prediction = optionalPrediction.get();
        prediction.setStatus(status);

        return predictionRepository.save(prediction);
    }

    @Override
    public Prediction getPrediction(Long userId, Long predictionId) {
        User user = userLookupService.requireById(userId);
        Optional<Prediction> optionalPrediction = predictionRepository.findByIdAndUserId(predictionId, userId);

        if (optionalPrediction.isEmpty()) {
            throw new PredictionDoesNotExistsException(predictionId, user.getUsername());
        }

        return optionalPrediction.get();
    }

    @Override
    public List<Prediction> getPredictionsBySignatureId(Long userId, Long signatureId) {
        userLookupService.requireById(userId);

        Optional<Signature> optionalSignature = signatureRepository.findByIdAndUserId(signatureId, userId);

        if (optionalSignature.isEmpty()) {
            throw new SignatureDoesNotExistsException(signatureId);
        }

        return predictionRepository.findBySignatureIdAndUserId(signatureId, userId);
    }

}
