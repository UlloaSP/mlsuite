package dev.ulloasp.mlsuite.prediction.controllers;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.prediction.dtos.CreatePredictionParams;
import dev.ulloasp.mlsuite.prediction.dtos.PredictionDto;
import dev.ulloasp.mlsuite.prediction.dtos.UpdatePredictionParams;
import dev.ulloasp.mlsuite.prediction.entities.Prediction;
import dev.ulloasp.mlsuite.prediction.entities.PredictionStatus;
import dev.ulloasp.mlsuite.prediction.exceptions.PredictionAlreadyExistsException;
import dev.ulloasp.mlsuite.prediction.exceptions.PredictionDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.services.PredictionService;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.util.ErrorDto;
import jakarta.servlet.http.HttpServletRequest;

@RestController
public class PredictionControllerImpl implements PredictionController {

    private final PredictionService predictionService;

    public PredictionControllerImpl(PredictionService predictionService) {
        this.predictionService = predictionService;
    }

    @Override
    public ResponseEntity<PredictionDto> createPrediction(OAuth2AuthenticationToken authentication,
            @RequestBody CreatePredictionParams params) {

        OAuthProvider oauthProvider = OAuthProvider.fromString(authentication.getAuthorizedClientRegistrationId());
        String oauthId = authentication.getPrincipal().getName();

        Prediction pred = predictionService.createPrediction(oauthProvider, oauthId, params.getSignatureId(),
                params.getName(), params.getPrediction(), params.getInputs());

        return ResponseEntity.status(HttpStatus.CREATED).body(PredictionDto.toDto(pred));
    }

    @Override
    public ResponseEntity<PredictionDto> updatePrediction(OAuth2AuthenticationToken authentication,
            @RequestBody UpdatePredictionParams params) {

        OAuthProvider oauthProvider = OAuthProvider.fromString(authentication.getAuthorizedClientRegistrationId());
        String oauthId = authentication.getPrincipal().getName();

        Prediction updatedPrediction = predictionService.updatePrediction(oauthProvider, oauthId,
                params.getPredictionId(), PredictionStatus.valueOf(params.getStatus()));

        return ResponseEntity.status(HttpStatus.CREATED).body(PredictionDto.toDto(updatedPrediction));
    }

    @Override
    public ResponseEntity<List<PredictionDto>> getAllPredictions(OAuth2AuthenticationToken authentication,
            @RequestParam Long signatureId) {

        OAuthProvider oauthProvider = OAuthProvider.fromString(authentication.getAuthorizedClientRegistrationId());
        String oauthId = authentication.getPrincipal().getName();

        List<Prediction> predictions = predictionService.getPredictionsBySignatureId(oauthProvider, oauthId,
                signatureId);

        return ResponseEntity.ok(PredictionDto.toDtoList(predictions));
    }

    @ExceptionHandler(PredictionAlreadyExistsException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ResponseEntity<ErrorDto> handlePredictionAlreadyExistsException(PredictionAlreadyExistsException e,
            HttpServletRequest req) {
        ErrorDto dto = ErrorDto.of(HttpStatus.CONFLICT.value(), e.getMessage(), req.getRequestURI());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(dto);
    }

    @ExceptionHandler(PredictionDoesNotExistsException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ResponseEntity<ErrorDto> handlePredictionDoesNotExistsException(PredictionDoesNotExistsException e,
            HttpServletRequest req) {
        ErrorDto dto = ErrorDto.of(HttpStatus.NOT_FOUND.value(), e.getMessage(), req.getRequestURI());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(dto);
    }

}
