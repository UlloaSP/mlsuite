/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.controllers;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import dev.ulloasp.mlsuite.prediction.dtos.CreateOutputFeedbackParams;
import dev.ulloasp.mlsuite.prediction.dtos.OutputFeedbackDto;
import dev.ulloasp.mlsuite.prediction.dtos.UpdateOutputFeedbackParams;

@RequestMapping("/api/output-feedback")
public interface OutputFeedbackController {

    @PostMapping("/create")
    ResponseEntity<OutputFeedbackDto> createOutputFeedback(
            OAuth2AuthenticationToken authentication,
            @RequestBody CreateOutputFeedbackParams params);

    @PostMapping("/update")
    ResponseEntity<OutputFeedbackDto> updateOutputFeedback(
            OAuth2AuthenticationToken authentication,
            @RequestBody UpdateOutputFeedbackParams params);

    @GetMapping("/all")
    ResponseEntity<List<OutputFeedbackDto>> getAllOutputFeedback(
            OAuth2AuthenticationToken authentication,
            @RequestParam Long predictionId);
}
