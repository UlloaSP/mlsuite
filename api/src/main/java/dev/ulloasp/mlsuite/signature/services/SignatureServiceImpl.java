/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.signature.services;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;

import dev.ulloasp.mlsuite.model.entities.Model;
import dev.ulloasp.mlsuite.model.exceptions.ModelDoesNotExistsException;
import dev.ulloasp.mlsuite.model.repositories.ModelRepository;
import dev.ulloasp.mlsuite.signature.entities.Signature;
import dev.ulloasp.mlsuite.signature.exceptions.SignatureAlreadyExistsException;
import dev.ulloasp.mlsuite.signature.exceptions.SignatureDoesNotExistsException;
import dev.ulloasp.mlsuite.signature.exceptions.SignatureNotSemVerException;
import dev.ulloasp.mlsuite.signature.repositories.SignatureRepository;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.service.UserLookupService;
import jakarta.annotation.Nullable;
import jakarta.transaction.Transactional;

@Service
@Transactional
public class SignatureServiceImpl implements SignatureService {

    private final UserLookupService userLookupService;
    private final SignatureRepository signatureRepository;
    private final ModelRepository modelRepository;
    private final SignatureSchemaCompatibilityService signatureSchemaCompatibilityService;

    public SignatureServiceImpl(UserLookupService userLookupService, SignatureRepository signatureRepository,
            ModelRepository modelRepository, SignatureSchemaCompatibilityService signatureSchemaCompatibilityService) {
        this.userLookupService = userLookupService;
        this.signatureRepository = signatureRepository;
        this.modelRepository = modelRepository;
        this.signatureSchemaCompatibilityService = signatureSchemaCompatibilityService;
    }

    @Override
    public Signature createSignature(Long userId, Long modelId,
            Map<String, Object> inputSignature, String name,
            int major, int minor, int patch, @Nullable Long origin) {
        User user = userLookupService.requireById(userId);

        Optional<Model> optionalModel = modelRepository.findByIdAndUserId(modelId, user.getId());

        if (optionalModel.isEmpty()) {
            throw new ModelDoesNotExistsException(modelId, user.getUsername());
        }

        Model model = optionalModel.get();

        if (signatureRepository.existsByModelIdAndInputSignature(model.getId(), inputSignature)) {
            throw new SignatureAlreadyExistsException(model.getId(), inputSignature);
        }

        if (signatureRepository.existsByModelIdAndMajorAndMinorAndPatch(model.getId(), major, minor, patch)) {
            throw new SignatureAlreadyExistsException(model.getId(), major, minor, patch);
        }

        if (major < 0 || minor < 0 || patch < 0) {
            throw new SignatureNotSemVerException(name);
        }

        signatureSchemaCompatibilityService.validate(user.getId(), inputSignature);

        Signature signature = new Signature(model, name, inputSignature);

        signature.setMajor(major);
        signature.setMinor(minor);
        signature.setPatch(patch);

        if (origin != null) {
            Optional<Signature> optionalOrigin = signatureRepository.findById(origin);
            if (optionalOrigin.isEmpty()) {
                throw new SignatureDoesNotExistsException(origin);
            }
            signature.setOrigin(optionalOrigin.get());
        }

        return signatureRepository.save(signature);
    }

    @Override
    public Signature getSignature(Long userId, Long signatureId) {
        User user = userLookupService.requireById(userId);

        Optional<Signature> optionalSignature = signatureRepository.findByIdAndUserId(signatureId, user.getId());

        if (optionalSignature.isEmpty()) {
            throw new SignatureDoesNotExistsException(signatureId, user.getUsername());
        }

        return optionalSignature.get();
    }

    @Override
    public List<Signature> getSignatureByModelId(Long userId, Long modelId) {
        User user = userLookupService.requireById(userId);

        Optional<Model> optionalModel = modelRepository.findByIdAndUserId(modelId, user.getId());

        if (optionalModel.isEmpty()) {
            throw new ModelDoesNotExistsException(modelId, user.getUsername());
        }

        return signatureRepository.findByModelId(optionalModel.get().getId());
    }

}
