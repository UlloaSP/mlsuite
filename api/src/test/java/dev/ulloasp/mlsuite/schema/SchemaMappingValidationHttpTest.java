package dev.ulloasp.mlsuite.schema;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaDraft;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaDraftStatus;

/**
 * A schema whose fields or reports map to inputs or outputs its bound models do not have is
 * refused where it is saved: as a version (which binds its models), as a published change, and as
 * a saved change. Each refusal names the mapping and points at it. Stored schemas are not
 * rewritten: the fixture's version maps its reports by name, as schemas stored before this check
 * may, and it still runs and still opens as a change.
 */
class SchemaMappingValidationHttpTest extends PublicPredictionFixture {

    @BeforeEach
    void modelsWithTheirPersistedSignatures() {
        authorizeOwner();
        inTransaction(() -> {
            Model forest = entityManager.find(Model.class, forestModel.getId());
            forest.setInputSchema(Map.of(
                    "fields", List.of(
                            Map.of("kind", "number", "mappedTo", "age"),
                            Map.of("kind", "number", "mappedTo", "chol"),
                            Map.of("kind", "onehot-category", "options", List.of(
                                    Map.of("mappedTo", "smoker__yes"), Map.of("mappedTo", "smoker__no")))),
                    "reports", List.of(Map.of("kind", "classifier", "mappedTo", 0))));
            Model net = entityManager.find(Model.class, netModel.getId());
            net.setInputSchema(Map.of(
                    "fields", List.of(Map.of("kind", "number", "mappedTo", 0), Map.of("kind", "number", "mappedTo", 1)),
                    "reports", List.of(Map.of("kind", "classifier", "mappedTo", 0),
                            Map.of("kind", "regressor", "mappedTo", 1))));
        });
    }

    @Test
    void aSchemaMappedToWhatItsModelsHaveIsSaved() throws Exception {
        saveVersion(formSchema(field("Age", Map.of("risk-forest", "age", "risk-net", 1)),
                report("Risk", Map.of("risk-forest", 0, "risk-net", "0"))))
                .andExpect(status().isCreated());
    }

    @Test
    void aReportReadingAnOutputItsModelLacksIsRefusedAndNamed() throws Exception {
        long versions = count("SchemaVersion");

        saveVersion(formSchema(field("Age", Map.of("risk-forest", "age")),
                report("Risk", Map.of("risk-forest", "risk"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        "Report \"Risk\" reads output \"risk\", which model \"risk-forest\" does not have (its outputs: 0)."))
                .andExpect(jsonPath("$.issues[0].pointer").value("/reports/0/mappedTo/risk-forest"));

        assertEquals(versions, count("SchemaVersion"));
    }

    @Test
    void aFieldSendingToAnInputNoModelHasIsRefusedAndNamed() throws Exception {
        saveVersion(formSchema(field("Age", "agee"), report("Risk", 0)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        "Field \"Age\" sends to input \"agee\", which none of the bound models (risk-forest, risk-net) has."))
                .andExpect(jsonPath("$.issues[0].pointer").value("/fields/0/mappedTo"));
    }

    @Test
    void everyMappingThatNamesNothingIsListedWhereItIs() throws Exception {
        Map<String, Object> smoker = Map.of("kind", "onehot-category", "label", "Smoker", "options", List.of(
                Map.of("label", "Yes", "value", "yes", "mappedTo", Map.of("risk-forest", "smoker__si"))));

        saveVersion(formSchema(smoker, report("Score", Map.of("risk-model", 1))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Field \"Smoker\" sends to input \"smoker__si\", which model "
                        + "\"risk-forest\" does not have (its inputs: age, chol, smoker__yes, smoker__no). 1 more mapping names "
                        + "nothing the bound models have."))
                .andExpect(jsonPath("$.issues.length()").value(2))
                .andExpect(jsonPath("$.issues[0].pointer").value("/fields/0/options/0/mappedTo/risk-forest"))
                .andExpect(jsonPath("$.issues[1].pointer").value("/reports/0/mappedTo"))
                .andExpect(jsonPath("$.issues[1].message").value("Report \"Score\" maps to no bound model."));
    }

    @Test
    void aStoredSchemaMappedByNameStillRunsAndOpensAsAChange() throws Exception {
        run(bookmark.getPublicId(), request(Map.of("in0", 52)));

        mockMvc.perform(signedIn(post("/api/schemas/{id}/drafts", schema.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Fix risk\",\"baseVersionId\":" + version.getId() + "}"), owner.getId()))
                .andExpect(status().isCreated());
    }

    @Test
    void savingAChangeThatMapsToNothingIsRefusedAndKeepsTheSavedOne() throws Exception {
        SchemaDraft draft = storedDraft();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("expectedDraftRevision", draft.currentRevision());
        body.put("name", "Fix risk");
        body.put("formSchema", formSchema(field("Age", Map.of("risk-forest", "age")), report("Risk", Map.of("risk-net", 7))));
        body.put("bindings", List.of(Map.of("modelId", forestModel.getId()), Map.of("modelId", netModel.getId())));

        mockMvc.perform(signedIn(put("/api/schema-drafts/{id}", draft.getId())
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(body)), owner.getId()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.issues[0].pointer").value("/reports/0/mappedTo/risk-net"))
                .andExpect(jsonPath("$.issues[0].message").value(
                        "Report \"Risk\" reads output \"7\", which model \"risk-net\" does not have (its outputs: 0, 1)."));

        entityManager.clear();
        assertEquals(draft.currentRevision(), entityManager.find(SchemaDraft.class, draft.getId()).currentRevision());
    }

    @Test
    void publishingAChangeThatMapsToNothingIsRefused() throws Exception {
        SchemaDraft draft = storedDraft();

        mockMvc.perform(signedIn(post("/api/schema-drafts/{id}/publish", draft.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedDraftRevision\":" + draft.currentRevision() + "}"), owner.getId()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.issues[0].pointer").value("/reports/0/mappedTo/risk-forest"));

        entityManager.clear();
        assertEquals(SchemaDraftStatus.DRAFT, entityManager.find(SchemaDraft.class, draft.getId()).getStatus());
    }

    /** A change opened on the fixture's version, as stored: its reports read outputs by name. */
    private SchemaDraft storedDraft() {
        SchemaDraft draft = new SchemaDraft(schema, version, "Fix risk", version.getFormSchema(), List.of(
                Map.of("modelId", forestModel.getId()), Map.of("modelId", netModel.getId())));
        inTransaction(() -> entityManager.persist(draft));
        return draft;
    }

    private ResultActions saveVersion(Map<String, Object> formSchema) throws Exception {
        Map<String, Object> body = Map.of("name", "v4", "formSchema", formSchema, "bindings", List.of(
                Map.of("modelId", forestModel.getId()), Map.of("modelId", netModel.getId())));
        return mockMvc.perform(signedIn(post("/api/schemas/{id}/versions", schema.getId())
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(body)), owner.getId()));
    }

    private static Map<String, Object> formSchema(Map<String, Object> field, Map<String, Object> report) {
        return Map.of("fields", List.of(field), "reports", List.of(report));
    }

    private static Map<String, Object> field(String label, Object mappedTo) {
        return Map.of("kind", "number", "label", label, "mappedTo", mappedTo);
    }

    private static Map<String, Object> report(String label, Object mappedTo) {
        return Map.of("kind", "classifier", "label", label, "mappedTo", mappedTo);
    }
}
