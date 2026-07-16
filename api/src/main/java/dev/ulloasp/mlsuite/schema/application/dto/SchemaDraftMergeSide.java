package dev.ulloasp.mlsuite.schema.application.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum SchemaDraftMergeSide {
    CURRENT, INCOMING;

    @JsonCreator
    public static SchemaDraftMergeSide fromJson(String value) {
        return value == null ? null : valueOf(value.toUpperCase(java.util.Locale.ROOT));
    }

    @JsonValue
    public String toJson() {
        return name().toLowerCase(java.util.Locale.ROOT);
    }
}
