package dev.ulloasp.mlsuite.review.application.dto;

import java.util.List;

import dev.ulloasp.mlsuite.model.application.dto.ModelDto;
import dev.ulloasp.mlsuite.signature.application.dto.SignatureDto;

public record ReviewLinkContextDto(
        ReviewOrganizationDto organization,
        ModelDto model,
        SignatureDto signature,
        List<ReviewPredictionListItemDto> predictions) {
}
