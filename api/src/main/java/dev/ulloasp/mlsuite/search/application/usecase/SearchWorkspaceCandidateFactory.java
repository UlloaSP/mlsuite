package dev.ulloasp.mlsuite.search.application.usecase;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.plugin.domain.model.PluginMetadata;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.search.application.dto.SearchResultDto;

final class SearchWorkspaceCandidateFactory {

    private SearchWorkspaceCandidateFactory() {
    }

    static SearchCandidate fromOrganization(Organization organization) {
        return candidate(
                "organization", organization.getId(), organization.getName(), organization.getSlug(),
                "/workspace/organizations/" + organization.getId(), organization.getId(), null,
                organization.getUpdatedAt(), organization.getName(), organization.getSlug());
    }

    static SearchCandidate fromModel(Model model) {
        return candidate(
                "model", model.getId(), model.getName(), model.getType() + " / " + model.getSpecificType(),
                "/models/" + model.getId(),
                model.getOrganization() == null ? null : model.getOrganization().getId(),
                model.getId(), model.getUpdatedAt(),
                model.getName(), model.getType(), model.getSpecificType(), model.getFileName());
    }

    static SearchCandidate fromSchema(Schema schema) {
        return candidate(
                "schema", schema.getId(), schema.getName(), schema.getDescription(), "/schemas/" + schema.getId(),
                schema.getOrganization().getId(), null, schema.getUpdatedAt(),
                schema.getName(), schema.getDescription());
    }

    static SearchCandidate fromSnapshot(SchemaVersion version) {
        Schema schema = version.getSchema();
        String title = version.getName() == null || version.getName().isBlank()
                ? schema.getName() + " v" + version.getVersion()
                : version.getName();
        return candidate(
                "snapshot", version.getId(), title, schema.getName() + " / v" + version.getVersion(),
                "/schemas/" + schema.getId() + "/versions/" + version.getId(),
                schema.getOrganization().getId(), null, version.getCreatedAt(),
                title, schema.getName(), "v" + version.getVersion(), String.valueOf(version.getVersion()));
    }

    static SearchCandidate fromBookmark(SchemaBookmark bookmark) {
        Schema schema = bookmark.getSchema();
        SchemaVersion version = bookmark.getVersion();
        String versionName = version.getName() == null ? "" : version.getName();
        String subtitle = schema.getName() + (versionName.isBlank() ? " / " : " / " + versionName + " / ")
                + "v" + version.getVersion();
        return candidate(
                "bookmark", bookmark.getId(), bookmark.getName(), subtitle,
                "/schemas/" + schema.getId() + "/bookmarks/" + bookmark.getId(),
                schema.getOrganization().getId(), null, bookmark.getUpdatedAt(),
                bookmark.getName(), schema.getName(), versionName, "v" + version.getVersion());
    }

    static SearchCandidate fromPredictionRun(PredictionRun run) {
        Schema schema = run.getSchemaVersion().getSchema();
        return candidate(
                "predictionRun", run.getId(), run.getName(), schema.getName() + " / " + run.getStatus(),
                "/inferences/" + run.getId(),
                schema.getOrganization().getId(), null, run.getUpdatedAt(), run.getName(), schema.getName());
    }

    static SearchCandidate fromPlugin(PluginMetadata plugin) {
        return new SearchCandidate(
                new SearchResultDto(
                        "plugin", plugin.getId(), plugin.getFileName(),
                        plugin.getKind() == null ? "Plugin" : plugin.getKind(), "/plugins",
                        plugin.getOrganization().getId(), null),
                plugin.getUpdatedAt(), plugin.getFileName(), plugin.getPluginType(), plugin.getKind());
    }

    private static SearchCandidate candidate(
            String type,
            Long id,
            String title,
            String subtitle,
            String href,
            Long organizationId,
            Long modelId,
            OffsetDateTime updatedAt,
            String... terms) {
        return new SearchCandidate(
                new SearchResultDto(type, String.valueOf(id), title, subtitle, href, organizationId, modelId),
                updatedAt,
                terms);
    }

    record SearchCandidate(SearchResultDto result, OffsetDateTime updatedAt, String... terms) {
    }
}
