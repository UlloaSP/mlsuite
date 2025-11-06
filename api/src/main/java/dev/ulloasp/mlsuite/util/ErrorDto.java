/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.util;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorDto(
        Instant timestamp,
        int status,
        String message,
        String path) {

    public static ErrorDto of(int status, String message, String path) {
        return new ErrorDto(Instant.now(), status, message, path);
    }
}
