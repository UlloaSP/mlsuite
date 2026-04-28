/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.adapter.in.web;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import dev.ulloasp.mlsuite.prediction.application.dto.CreateTargetParams;
import dev.ulloasp.mlsuite.prediction.application.dto.TargetDto;
import dev.ulloasp.mlsuite.prediction.application.dto.UpdateTargetParams;
import jakarta.validation.Valid;

@RequestMapping("/api/targets")
public interface TargetController {

        @PostMapping
        ResponseEntity<TargetDto> createTarget(OAuth2AuthenticationToken authentication,
                        @Valid @RequestBody CreateTargetParams params);

        @PatchMapping
        ResponseEntity<TargetDto> updateTarget(OAuth2AuthenticationToken authentication,
                        @Valid @RequestBody UpdateTargetParams params);

        @GetMapping
        ResponseEntity<List<TargetDto>> getAllTargets(OAuth2AuthenticationToken authentication,
                        @RequestParam Long predictionId);
}

