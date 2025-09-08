package dev.ulloasp.mlsuite.analyzer.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.analyzer.services.AnalyzerService;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import jakarta.annotation.Nullable;

@RestController
public class AnalyzerControllerImpl implements AnalyzerController {

    private final AnalyzerService analyzerService;

    public AnalyzerControllerImpl(AnalyzerService analyzerService) {
        this.analyzerService = analyzerService;
    }

    @Override
    public ResponseEntity<Map<String, Object>> generateSchema(
            OAuth2AuthenticationToken authentication,
            @RequestPart("model") MultipartFile model,
            @Nullable @RequestPart(value = "dataframe", required = false) MultipartFile dataframe) {
        Map<String, Object> schema = analyzerService.generateInputSignature(
                OAuthProvider.fromString(authentication.getAuthorizedClientRegistrationId()),
                authentication.getPrincipal().getName(),
                model,
                dataframe);

        return ResponseEntity.ok(schema);
    }

    @Override
    public ResponseEntity<Map<String, Object>> predict(
            OAuth2AuthenticationToken authentication,
            @RequestParam Long modelId,
            @RequestPart("data") Map<String, Object> data) {
        Map<String, Object> prediction = analyzerService.predict(
                OAuthProvider.fromString(authentication.getAuthorizedClientRegistrationId()),
                authentication.getPrincipal().getName(),
                modelId,
                data);
        return ResponseEntity.ok(prediction);
    }

    @Override
    public ResponseEntity<Map<String, Object>> predict(OAuth2AuthenticationToken authentication,
            @RequestParam MultipartFile modelBlob, @RequestPart("data") Map<String, Object> data) {

        Map<String, Object> prediction = analyzerService.predict(
                OAuthProvider.fromString(authentication.getAuthorizedClientRegistrationId()),
                authentication.getPrincipal().getName(),
                modelBlob,
                data);
        return ResponseEntity.ok(prediction);
    }

}
