package dev.ulloasp.mlsuite.prediction.controllers;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.prediction.dtos.CreateTargetParams;
import dev.ulloasp.mlsuite.prediction.dtos.TargetDto;
import dev.ulloasp.mlsuite.prediction.dtos.UpdateTargetParams;
import dev.ulloasp.mlsuite.prediction.entities.Target;
import dev.ulloasp.mlsuite.prediction.services.TargetService;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;

@RestController
public class TargetControllerImpl implements TargetController {

    private final TargetService targetService;

    public TargetControllerImpl(TargetService targetService) {
        this.targetService = targetService;
    }

    @Override
    public ResponseEntity<TargetDto> createTarget(OAuth2AuthenticationToken authentication,
            @RequestBody CreateTargetParams params) {

        OAuthProvider oauthProvider = OAuthProvider.fromString(authentication.getAuthorizedClientRegistrationId());
        String oauthId = authentication.getPrincipal().getName();

        Target target = targetService.createTarget(oauthProvider, oauthId, params.getPredictionId(),
                params.getOrder(), params.getValue());

        return ResponseEntity.status(HttpStatus.CREATED).body(TargetDto.toDto(target));
    }

    @Override
    public ResponseEntity<TargetDto> updateTarget(OAuth2AuthenticationToken authentication,
            @RequestBody UpdateTargetParams params) {

        OAuthProvider oauthProvider = OAuthProvider.fromString(authentication.getAuthorizedClientRegistrationId());
        String oauthId = authentication.getPrincipal().getName();

        Target updatedTarget = targetService.updateTarget(oauthProvider, oauthId, params.getTargetId(),
                params.getRealValue());

        return ResponseEntity.status(HttpStatus.CREATED).body(TargetDto.toDto(updatedTarget));
    }

    @Override
    public ResponseEntity<List<TargetDto>> getAllTargets(OAuth2AuthenticationToken authentication,
            @RequestParam Long predictionId) {

        OAuthProvider oauthProvider = OAuthProvider.fromString(authentication.getAuthorizedClientRegistrationId());
        String oauthId = authentication.getPrincipal().getName();

        List<Target> targets = targetService.getTargetsByPredictionId(oauthProvider, oauthId, predictionId);

        return ResponseEntity.ok(TargetDto.toDtoList(targets));
    }

}
