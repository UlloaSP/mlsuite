/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.adapter.in.web;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import dev.ulloasp.mlsuite.prediction.application.dto.CreateOutputFeedbackParams;
import dev.ulloasp.mlsuite.prediction.application.dto.OutputFeedbackDto;
import dev.ulloasp.mlsuite.prediction.application.dto.UpdateOutputFeedbackParams;
import jakarta.validation.Valid;

@RequestMapping("/api/output-feedback")
public interface OutputFeedbackController {

    @PostMapping
    ResponseEntity<OutputFeedbackDto> createOutputFeedback(
            Authentication authentication,
            @Valid @RequestBody CreateOutputFeedbackParams params);

    @PatchMapping
    ResponseEntity<OutputFeedbackDto> updateOutputFeedback(
            Authentication authentication,
            @Valid @RequestBody UpdateOutputFeedbackParams params);

    @GetMapping
    ResponseEntity<List<OutputFeedbackDto>> getAllOutputFeedback(
            Authentication authentication,
            @RequestParam Long predictionId);
}

