package dev.ulloasp.mlsuite.apiaccess.application.dto;

/** A key just issued, with the secret this answer alone carries. */
public record IssuedApiClientKeyDto(ApiClientKeyDto key, String secret) {
}
