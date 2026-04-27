/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.controllers;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import dev.ulloasp.mlsuite.prediction.dtos.CreateExplanationFeedbackParams;
import dev.ulloasp.mlsuite.prediction.dtos.ExplanationFeedbackDto;
import dev.ulloasp.mlsuite.prediction.dtos.UpdateExplanationFeedbackParams;

@RequestMapping("/api/explanation-feedback")
public interface ExplanationFeedbackController {

    @PostMapping("/create")
    ResponseEntity<ExplanationFeedbackDto> createExplanationFeedback(Authentication authentication,
            @RequestBody CreateExplanationFeedbackParams params);

    @PostMapping("/update")
    ResponseEntity<ExplanationFeedbackDto> updateExplanationFeedback(Authentication authentication,
            @RequestBody UpdateExplanationFeedbackParams params);

    @GetMapping("/all")
    ResponseEntity<List<ExplanationFeedbackDto>> getAllExplanationFeedback(
            Authentication authentication, @RequestParam Long predictionId);
}
