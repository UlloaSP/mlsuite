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
import dev.ulloasp.mlsuite.prediction.repositories.ExplanationFeedbackRepository;
import dev.ulloasp.mlsuite.prediction.repositories.OutputFeedbackRepository;
import dev.ulloasp.mlsuite.prediction.repositories.PredictionRepository;
import dev.ulloasp.mlsuite.prediction.repositories.TargetRepository;
import dev.ulloasp.mlsuite.organization.repositories.OrganizationRepository;
import dev.ulloasp.mlsuite.signature.entities.Signature;
import dev.ulloasp.mlsuite.signature.exceptions.SignatureDoesNotExistsException;
import dev.ulloasp.mlsuite.signature.repositories.SignatureRepository;
import dev.ulloasp.mlsuite.signature.services.SignatureSchemaCompatibilityService;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.service.UserLookupService;
import jakarta.transaction.Transactional;

@Service
@Transactional
public class PredictionServiceImpl implements PredictionService {

    private final UserLookupService userLookupService;
    private final SignatureRepository signatureRepository;
    private final PredictionRepository predictionRepository;
    private final TargetRepository targetRepository;
    private final OutputFeedbackRepository outputFeedbackRepository;
    private final ExplanationFeedbackRepository explanationFeedbackRepository;
    private final OrganizationRepository organizationRepository;
    private final SignatureSchemaCompatibilityService signatureSchemaCompatibilityService;

    public PredictionServiceImpl(UserLookupService userLookupService, SignatureRepository signatureRepository,
            PredictionRepository predictionRepository,
            TargetRepository targetRepository,
            OutputFeedbackRepository outputFeedbackRepository,
            ExplanationFeedbackRepository explanationFeedbackRepository,
            OrganizationRepository organizationRepository,
            SignatureSchemaCompatibilityService signatureSchemaCompatibilityService) {
        this.userLookupService = userLookupService;
        this.signatureRepository = signatureRepository;
        this.predictionRepository = predictionRepository;
        this.targetRepository = targetRepository;
        this.outputFeedbackRepository = outputFeedbackRepository;
        this.explanationFeedbackRepository = explanationFeedbackRepository;
        this.organizationRepository = organizationRepository;
        this.signatureSchemaCompatibilityService = signatureSchemaCompatibilityService;
    }

    public PredictionServiceImpl(UserLookupService userLookupService, SignatureRepository signatureRepository,
            PredictionRepository predictionRepository,
            TargetRepository targetRepository,
            OutputFeedbackRepository outputFeedbackRepository,
            ExplanationFeedbackRepository explanationFeedbackRepository,
            SignatureSchemaCompatibilityService signatureSchemaCompatibilityService) {
        this(userLookupService, signatureRepository, predictionRepository, targetRepository,
                outputFeedbackRepository, explanationFeedbackRepository, null, signatureSchemaCompatibilityService);
    }

    @Override
    public Prediction createPrediction(Long userId, Long organizationId, Long signatureId, String name,
            boolean overwrite, Map<String, Object> prediction, Map<String, Object> data) {
        User user = userLookupService.requireById(userId);
        Optional<Signature> optionalSignature = signatureRepository.findByIdAndOrganizationId(signatureId, organizationId);

        if (optionalSignature.isEmpty()) {
            throw new SignatureDoesNotExistsException(signatureId);
        }

        Signature signature = optionalSignature.get();
        signatureSchemaCompatibilityService.validate(user.getId(), organizationId, signature.getInputSignature());

        Optional<Prediction> existingPrediction = predictionRepository.findBySignatureIdAndName(signature.getId(),
                name);

        if (existingPrediction.isPresent() && !overwrite) {
            throw new PredictionAlreadyExistsException(name, signature.getName());
        }

        if (existingPrediction.isPresent()) {
            Prediction storedPrediction = existingPrediction.get();
            storedPrediction.setData(data);
            storedPrediction.setPrediction(prediction);
            storedPrediction.setStatus(PredictionStatus.PENDING);
            targetRepository.deleteByPredictionId(storedPrediction.getId());
            outputFeedbackRepository.deleteByPredictionId(storedPrediction.getId());
            explanationFeedbackRepository.deleteByPredictionId(storedPrediction.getId());
            return predictionRepository.save(storedPrediction);
        }

        Prediction pred = new Prediction(
                signature,
                organizationRepository != null
                        ? organizationRepository.findById(organizationId).orElseThrow()
                        : signature.getOrganization(),
                user,
                name,
                data,
                prediction);

        return predictionRepository.save(pred);

    }

    @Override
    public Prediction updatePrediction(Long userId, Long organizationId, Long predictionId,
            PredictionStatus status) {
        User user = userLookupService.requireById(userId);
        Optional<Prediction> optionalPrediction = predictionRepository.findByIdAndOrganizationId(predictionId, organizationId);

        if (optionalPrediction.isEmpty()) {
            throw new PredictionDoesNotExistsException(predictionId, user.getUsername());
        }

        Prediction prediction = optionalPrediction.get();
        prediction.setStatus(status);

        return predictionRepository.save(prediction);
    }

    @Override
    public Prediction getPrediction(Long userId, Long organizationId, Long predictionId) {
        User user = userLookupService.requireById(userId);
        Optional<Prediction> optionalPrediction = predictionRepository.findByIdAndOrganizationId(predictionId, organizationId);

        if (optionalPrediction.isEmpty()) {
            throw new PredictionDoesNotExistsException(predictionId, user.getUsername());
        }

        return optionalPrediction.get();
    }

    @Override
    public List<Prediction> getPredictionsBySignatureId(Long userId, Long organizationId, Long signatureId) {
        userLookupService.requireById(userId);

        Optional<Signature> optionalSignature = signatureRepository.findByIdAndOrganizationId(signatureId, organizationId);

        if (optionalSignature.isEmpty()) {
            throw new SignatureDoesNotExistsException(signatureId);
        }

        return predictionRepository.findBySignatureIdAndOrganizationId(signatureId, organizationId);
    }

    public Prediction createPrediction(Long userId, Long signatureId, String name,
            boolean overwrite, Map<String, Object> prediction, Map<String, Object> data) {
        User user = userLookupService.requireById(userId);
        Signature signature = signatureRepository.findByIdAndUserId(signatureId, userId)
                .orElseThrow(() -> new SignatureDoesNotExistsException(signatureId));
        signatureSchemaCompatibilityService.validate(userId, signature.getInputSignature());
        Optional<Prediction> existingPrediction = predictionRepository.findBySignatureIdAndName(signature.getId(), name);
        if (existingPrediction.isPresent() && !overwrite) {
            throw new PredictionAlreadyExistsException(name, signature.getName());
        }
        if (existingPrediction.isPresent()) {
            Prediction storedPrediction = existingPrediction.get();
            storedPrediction.setData(data);
            storedPrediction.setPrediction(prediction);
            storedPrediction.setStatus(PredictionStatus.PENDING);
            targetRepository.deleteByPredictionId(storedPrediction.getId());
            outputFeedbackRepository.deleteByPredictionId(storedPrediction.getId());
            explanationFeedbackRepository.deleteByPredictionId(storedPrediction.getId());
            return predictionRepository.save(storedPrediction);
        }
        return predictionRepository.save(new Prediction(signature, signature.getOrganization(), user, name, data, prediction));
    }

    public Prediction updatePrediction(Long userId, Long predictionId, PredictionStatus status) {
        User user = userLookupService.requireById(userId);
        Prediction prediction = predictionRepository.findByIdAndUserId(predictionId, userId)
                .orElseThrow(() -> new PredictionDoesNotExistsException(predictionId, user.getUsername()));
        prediction.setStatus(status);
        return predictionRepository.save(prediction);
    }

    public Prediction getPrediction(Long userId, Long predictionId) {
        User user = userLookupService.requireById(userId);
        return predictionRepository.findByIdAndUserId(predictionId, userId)
                .orElseThrow(() -> new PredictionDoesNotExistsException(predictionId, user.getUsername()));
    }

    public List<Prediction> getPredictionsBySignatureId(Long userId, Long signatureId) {
        userLookupService.requireById(userId);
        if (signatureRepository.findByIdAndUserId(signatureId, userId).isEmpty()) {
            throw new SignatureDoesNotExistsException(signatureId);
        }
        return predictionRepository.findBySignatureIdAndUserId(signatureId, userId);
    }

}
