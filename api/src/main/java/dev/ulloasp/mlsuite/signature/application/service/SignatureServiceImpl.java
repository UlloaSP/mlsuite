/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.signature.application.service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;

import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.model.domain.exception.ModelDoesNotExistsException;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.signature.domain.model.Signature;
import dev.ulloasp.mlsuite.signature.domain.exception.SignatureAlreadyExistsException;
import dev.ulloasp.mlsuite.signature.domain.exception.SignatureDoesNotExistsException;
import dev.ulloasp.mlsuite.signature.domain.exception.SignatureNotSemVerException;
import dev.ulloasp.mlsuite.signature.adapter.out.persistence.repository.SignatureRepository;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import jakarta.annotation.Nullable;
import jakarta.transaction.Transactional;

@Service
@Transactional
public class SignatureServiceImpl implements SignatureService {

    private final UserLookupService userLookupService;
    private final SignatureRepository signatureRepository;
    private final ModelRepository modelRepository;
    private final SignatureSchemaCompatibilityService signatureSchemaCompatibilityService;
    private final WorkspaceAccessService workspaceAccessService;
    private final WorkspaceAuthorizationService workspaceAuthorizationService;

    public SignatureServiceImpl(UserLookupService userLookupService, SignatureRepository signatureRepository,
            ModelRepository modelRepository, SignatureSchemaCompatibilityService signatureSchemaCompatibilityService,
            WorkspaceAccessService workspaceAccessService,
            WorkspaceAuthorizationService workspaceAuthorizationService) {
        this.userLookupService = userLookupService;
        this.signatureRepository = signatureRepository;
        this.modelRepository = modelRepository;
        this.signatureSchemaCompatibilityService = signatureSchemaCompatibilityService;
        this.workspaceAccessService = workspaceAccessService;
        this.workspaceAuthorizationService = workspaceAuthorizationService;
    }

    @Override
    public Signature createSignature(Long userId, Long modelId,
            Map<String, Object> inputSignature, String name,
            int major, int minor, int patch, @Nullable Long origin) {
        User user = userLookupService.requireById(userId);
        Long organizationId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        workspaceAuthorizationService.requireOrganizationOperate(userId, organizationId);

        Optional<Model> optionalModel = modelRepository.findByIdAndOrganizationId(modelId, organizationId);

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

        Long organizationId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        workspaceAuthorizationService.requireOrganizationRead(userId, organizationId);
        Optional<Signature> optionalSignature = signatureRepository.findByIdAndOrganizationId(signatureId, organizationId);

        if (optionalSignature.isEmpty()) {
            throw new SignatureDoesNotExistsException(signatureId, user.getUsername());
        }

        return optionalSignature.get();
    }

    @Override
    public List<Signature> getSignatureByModelId(Long userId, Long modelId) {
        User user = userLookupService.requireById(userId);

        Long organizationId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        workspaceAuthorizationService.requireOrganizationRead(userId, organizationId);
        Optional<Model> optionalModel = modelRepository.findByIdAndOrganizationId(modelId, organizationId);

        if (optionalModel.isEmpty()) {
            throw new ModelDoesNotExistsException(modelId, user.getUsername());
        }

        return signatureRepository.findByModelId(optionalModel.get().getId());
    }

}

