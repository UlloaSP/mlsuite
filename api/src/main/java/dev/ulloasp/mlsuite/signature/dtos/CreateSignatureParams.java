/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.signature.dtos;

import java.util.Map;

import jakarta.annotation.Nullable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Setter
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class CreateSignatureParams {
    private Long modelId;
    private String name;
    private Map<String, Object> inputSignature;
    private int major;
    private int minor;
    private int patch;
    private @Nullable Long origin;
}
