/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.adapter.in.web;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import dev.ulloasp.mlsuite.prediction.application.dto.CreateExplanationFeedbackParams;
import dev.ulloasp.mlsuite.prediction.application.dto.ExplanationFeedbackDto;
import dev.ulloasp.mlsuite.prediction.application.dto.UpdateExplanationFeedbackParams;
import jakarta.validation.Valid;

@RequestMapping("/api/explanation-feedback")
public interface ExplanationFeedbackController {

    @PostMapping
    ResponseEntity<ExplanationFeedbackDto> createExplanationFeedback(Authentication authentication,
            @Valid @RequestBody CreateExplanationFeedbackParams params);

    @PatchMapping
    ResponseEntity<ExplanationFeedbackDto> updateExplanationFeedback(Authentication authentication,
            @Valid @RequestBody UpdateExplanationFeedbackParams params);

    @GetMapping
    ResponseEntity<List<ExplanationFeedbackDto>> getAllExplanationFeedback(
            Authentication authentication, @RequestParam Long predictionId);
}

