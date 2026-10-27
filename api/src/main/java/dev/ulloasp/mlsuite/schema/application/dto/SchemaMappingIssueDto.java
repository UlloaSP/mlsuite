package dev.ulloasp.mlsuite.schema.application.dto;

/**
 * A mapping that names nothing a bound model has. {@code pointer} is the JSON pointer, within the
 * form schema, of the {@code mappedTo} (or of its entry for one model) that names it.
 */
public record SchemaMappingIssueDto(String pointer, String message) {
}
