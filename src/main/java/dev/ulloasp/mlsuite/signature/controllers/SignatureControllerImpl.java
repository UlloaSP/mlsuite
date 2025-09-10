package dev.ulloasp.mlsuite.signature.controllers;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.signature.dtos.CreateSignatureParams;
import dev.ulloasp.mlsuite.signature.dtos.SignatureDto;
import dev.ulloasp.mlsuite.signature.entities.Signature;
import dev.ulloasp.mlsuite.signature.exceptions.SignatureAlreadyExistsException;
import dev.ulloasp.mlsuite.signature.exceptions.SignatureDoesNotExistsException;
import dev.ulloasp.mlsuite.signature.exceptions.SignatureNotFromUserException;
import dev.ulloasp.mlsuite.signature.exceptions.SignatureNotSemVerException;
import dev.ulloasp.mlsuite.signature.services.SignatureService;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.util.ErrorDto;
import jakarta.servlet.http.HttpServletRequest;

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

    @ExceptionHandler(SignatureAlreadyExistsException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ResponseEntity<ErrorDto> handleSignatureAlreadyExistsException(SignatureAlreadyExistsException e,
            HttpServletRequest req) {
        ErrorDto dto = ErrorDto.of(HttpStatus.CONFLICT.value(), e.getMessage(), req.getRequestURI());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(dto);
    }

    @ExceptionHandler(SignatureDoesNotExistsException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ResponseEntity<ErrorDto> handleSignatureDoesNotExistsException(SignatureDoesNotExistsException e,
            HttpServletRequest req) {
        ErrorDto dto = ErrorDto.of(HttpStatus.NOT_FOUND.value(), e.getMessage(), req.getRequestURI());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(dto);
    }

    @ExceptionHandler(SignatureNotFromUserException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ResponseEntity<ErrorDto> handleSignatureNotFromUserException(SignatureNotFromUserException e,
            HttpServletRequest req) {
        ErrorDto dto = ErrorDto.of(HttpStatus.FORBIDDEN.value(), e.getMessage(), req.getRequestURI());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(dto);
    }

    @ExceptionHandler(SignatureNotSemVerException.class)
    @ResponseStatus(HttpStatus.PRECONDITION_FAILED)
    public ResponseEntity<ErrorDto> handleSignatureNotSemVerException(SignatureNotSemVerException e,
            HttpServletRequest req) {
        ErrorDto dto = ErrorDto.of(HttpStatus.PRECONDITION_FAILED.value(), e.getMessage(), req.getRequestURI());
        return ResponseEntity.status(HttpStatus.PRECONDITION_FAILED).body(dto);
    }
}
