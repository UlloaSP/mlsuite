package dev.ulloasp.mlsuite.schema.application.dto;

import java.util.Map;

/**
 * A curated example as anyone may read it: an opaque id, the run's name as its label, and the
 * values that fill the public form. It names no run, member, model, or date, and carries no output.
 */
public record PublicBookmarkExampleDto(String id, String name, Map<String, Object> inputs) {
}
