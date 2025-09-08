package dev.ulloasp.mlsuite.signature.controllers;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.signature.dtos.CreateSignatureParams;
import dev.ulloasp.mlsuite.signature.dtos.SignatureDto;
import dev.ulloasp.mlsuite.signature.entities.Signature;
import dev.ulloasp.mlsuite.signature.services.SignatureService;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;

@RestController
public class SignatureControllerImpl implements SignatureController {

    private final SignatureService signatureService;

    public SignatureControllerImpl(SignatureService signatureService) {
        this.signatureService = signatureService;
    }

    @Override
    public ResponseEntity<SignatureDto> createSignature(OAuth2AuthenticationToken authentication,
            @RequestBody CreateSignatureParams params) {
        Signature signature = signatureService.createSignature(
                OAuthProvider.fromString(authentication.getAuthorizedClientRegistrationId()),
                authentication.getPrincipal().getName(),
                params.getModelId(),
                params.getInputSignature(),
                params.getName(),
                params.getMajor(),
                params.getMinor(),
                params.getPatch(),
                params.getOrigin());

        return ResponseEntity.status(HttpStatus.CREATED).body(SignatureDto.toDto(signature));
    }

    @Override
    public ResponseEntity<List<SignatureDto>> getAllSignatures(OAuth2AuthenticationToken authentication,
            @RequestParam Long modelId) {
        List<Signature> signatures = signatureService.getSignatureByModelId(
                OAuthProvider.fromString(authentication.getAuthorizedClientRegistrationId()),
                authentication.getPrincipal().getName(), modelId);
        return ResponseEntity.ok(SignatureDto.toDtoList(signatures));
    }

    @Override
    public ResponseEntity<SignatureDto> getSignatureById(OAuth2AuthenticationToken authentication,
            @PathVariable Long signatureId) {
        Signature signature = signatureService.getSignature(
                OAuthProvider.fromString(authentication.getAuthorizedClientRegistrationId()),
                authentication.getPrincipal().getName(), signatureId);
        return ResponseEntity.ok(SignatureDto.toDto(signature));
    }

}
