package dev.ulloasp.mlsuite.prediction.controllers;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import dev.ulloasp.mlsuite.prediction.dtos.CreateTargetParams;
import dev.ulloasp.mlsuite.prediction.dtos.TargetDto;
import dev.ulloasp.mlsuite.prediction.dtos.UpdateTargetParams;

@RequestMapping("/api/target")
public interface TargetController {

        @PostMapping("/create")
        ResponseEntity<TargetDto> createTarget(OAuth2AuthenticationToken authentication,
                        @RequestBody CreateTargetParams params);

        @PostMapping("/update")
        ResponseEntity<TargetDto> updateTarget(OAuth2AuthenticationToken authentication,
                        @RequestBody UpdateTargetParams params);

        @GetMapping("/all")
        ResponseEntity<List<TargetDto>> getAllTargets(OAuth2AuthenticationToken authentication,
                        @RequestParam Long predictionId);
}
