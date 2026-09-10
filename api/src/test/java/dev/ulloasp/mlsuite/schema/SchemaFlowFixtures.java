package dev.ulloasp.mlsuite.schema;

import java.util.List;
import java.util.Map;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.schema.application.dto.CreatePredictionResultRequest;
import dev.ulloasp.mlsuite.schema.domain.model.*;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.dto.WorkspacePermissionsDto;

final class SchemaFlowFixtures {
    private SchemaFlowFixtures() {}
    static CreatePredictionResultRequest result(Long modelId, PredictionResultStatus status) {
        return new CreatePredictionResultRequest(modelId, Map.of("age", 52),
                status == PredictionResultStatus.SUCCESS ? Map.of("reports", List.of()) : Map.of(),
                status,
                status == PredictionResultStatus.FAILED ? "failed" : null,
                status == PredictionResultStatus.FAILED ? Map.of("status", 500) : null);
    }

    static Map<String, Object> formSchema() {
        return Map.of("fields", List.of(Map.of("id", "age", "kind", "number", "label", "Age")));
    }

    static SchemaModelBinding binding(SchemaVersion version, Long modelId) {
        return new SchemaModelBinding(version, model(modelId), Map.of());
    }

    static SchemaVersion version() {
        SchemaVersion version = new SchemaVersion(schema(), 1, "v1", formSchema());
        version.setId(9L);
        return version;
    }

    static SchemaBookmark bookmark() {
        SchemaBookmark bookmark = new SchemaBookmark(schema(), version(), "production");
        bookmark.setId(70L);
        return bookmark;
    }

    static PredictionResult predictionResult() {
        PredictionRun run = new PredictionRun(version(), "case", Map.of(), PredictionRunStatus.SUCCESS);
        PredictionResult result = new PredictionResult(run, model(11L),
                Map.of(), Map.of(), PredictionResultStatus.SUCCESS, null, null);
        result.setId(77L);
        return result;
    }

    static Model model(Long id) {
        Model model = new Model(); model.setId(id); model.setOrganization(organization());
        model.setUser(user()); model.setName("model-" + id); return model;
    }

    static Schema schema() {
        Schema schema = new Schema(organization(), "Risk", null); schema.setId(5L); schema.setUpdatedBy(user()); return schema;
    }

    static Organization organization() {
        Organization organization = new Organization();
        organization.setId(41L); organization.setName("Org"); organization.setSlug("org");
        organization.setCreatedBy(user()); return organization;
    }

    static User user() {
        User user = new User(); user.setId(7L); user.setUsername("alice"); user.setFullName("Alice"); return user;
    }

    static WorkspacePermissionsDto permissions() {
        return new WorkspacePermissionsDto(true, true, true, true, true, true, true, true, true, true, true,
                true, true, true, true, true, true, true, true, true, true);
    }
}
