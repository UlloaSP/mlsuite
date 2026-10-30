package dev.ulloasp.mlsuite.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.Resource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.MultiValueMap;

import com.zaxxer.hikari.HikariDataSource;

import dev.ulloasp.mlsuite.model.domain.exception.AnalyzerServiceException;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.role.domain.model.RoleScope;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;
import dev.ulloasp.mlsuite.storage.ArtifactHash;
import dev.ulloasp.mlsuite.storage.ArtifactSource;
import dev.ulloasp.mlsuite.storage.ModelArtifactWriter;
import dev.ulloasp.mlsuite.support.TestFixtures;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;

/**
 * A model is created from one upload of its bundle: the member's right to create it and the name
 * are checked first, the runtime reads the bundle with no transaction or connection held (it may
 * take far longer than a prediction), and only then is the model stored.
 */
class ModelUploadHttpTest extends PublicPredictionFixture {

    private static final byte[] BUNDLE = "a-bundle".getBytes();
    private static final Map<String, Object> INSPECTION = Map.of("type", "classifier", "specificType", "Forest",
            "fileName", "risk.mlbundle", "schema", Map.of("fields", List.of(), "reports", List.of()),
            "manifest", Map.of("writer_version", "0.2.1"), "environment", Map.of("key", "legacy"));

    @MockitoBean ModelArtifactWriter artifactWriter;
    private final List<String> held = new ArrayList<>();

    @BeforeEach
    void signInTheOwner() {
        authorizeOwner();
        doAnswer(call -> {
            TestFixtures.storedArtifact(call.getArgument(0), BUNDLE);
            return null;
        }).when(artifactWriter).storeAndAttach(any(), any(), any(), any());
        when(analyzer.inspect(any())).thenAnswer(call -> {
            MultiValueMap<String, ?> parts = call.getArgument(0);
            assertEquals("risk.mlbundle", ((Resource) parts.getFirst("model_file")).getFilename());
            held.add("transaction " + TransactionSynchronizationManager.isActualTransactionActive() + ", connections "
                    + dataSource.unwrap(HikariDataSource.class).getHikariPoolMXBean().getActiveConnections());
            return INSPECTION;
        });
    }

    @Test
    void aBundleIsReadByTheRuntimeWithNoConnectionHeldAndStoredOnce() throws Exception {
        long models = count("Model");

        mockMvc.perform(upload("Risk forest", owner.getId()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.model.name").value("Risk forest"));

        assertEquals(List.of("transaction false, connections 0"), held);
        assertEquals(models + 1, count("Model"));
        Model stored = entityManager.createQuery(
                "select m from Model m where m.name = 'Risk forest' and m.organization.id = :organization", Model.class)
                .setParameter("organization", organization.getId()).getSingleResult();
        assertEquals("Forest", stored.getSpecificType());
        assertEquals((long) BUNDLE.length, stored.getModelSizeBytes());
        verify(artifactWriter).storeAndAttach(any(Model.class), any(ArtifactSource.class), eq(ArtifactHash.sha256(BUNDLE)),
                eq("application/octet-stream"));
    }

    @Test
    void aNameAlreadyTakenIsRefusedBeforeTheBundleIsRead() throws Exception {
        mockMvc.perform(upload("risk-forest", owner.getId())).andExpect(status().isConflict());

        verify(analyzer, never()).inspect(any());
    }

    @Test
    void aMemberWhoMayNotCreateModelsIsRefusedBeforeTheBundleIsRead() throws Exception {
        long viewer = inTransactionReturning(() -> {
            String unique = "viewer" + System.nanoTime();
            User user = new User(unique, unique + "@example.test", "unused", "Viewer", SystemRole.USER);
            entityManager.persist(user);
            RoleDefinition role = new RoleDefinition(organization, RoleScope.ORGANIZATION, "Viewer", unique, null);
            role.setPermissions(EnumSet.of(PermissionKey.VIEW_MODELS));
            entityManager.persist(role);
            entityManager.persist(new OrganizationMembership(organization, user, role, MembershipStatus.ACTIVE));
            user.setCurrentOrganization(organization);
            return user.getId();
        });

        mockMvc.perform(upload("Risk forest", viewer)).andExpect(status().isForbidden());

        verify(analyzer, never()).inspect(any());
    }

    @Test
    void aBundleTheRuntimeCannotReadIsRefusedWithItsReasonAndNothingIsStored() throws Exception {
        doThrow(new AnalyzerServiceException(400, "Cannot load bundle: bad zip")).when(analyzer).inspect(any());
        long models = count("Model");

        mockMvc.perform(upload("Broken", owner.getId()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Cannot load bundle: bad zip"));

        assertEquals(models, count("Model"));
        verify(artifactWriter, never()).storeAndAttach(any(), any(), any(), any());
    }

    @Test
    void theSeparateInspectionRouteIsGone() throws Exception {
        MockMultipartFile artifact = new MockMultipartFile("artifact", "risk.mlbundle", "application/octet-stream", BUNDLE);
        int status = mockMvc.perform(signedIn(multipart("/api/analyzer/artifacts/inspect").file(artifact), owner.getId()))
                .andReturn().getResponse().getStatus();

        assertTrue(status == 404 || status == 405, "answered " + status);
        verify(analyzer, never()).inspect(any());
    }

    private MockMultipartHttpServletRequestBuilder upload(String name, long userId) {
        MockMultipartFile file = new MockMultipartFile("modelFile", "risk.mlbundle", "application/octet-stream", BUNDLE);
        return signedIn(multipart("/api/models").file(file).param("name", name), userId);
    }

    private long inTransactionReturning(Supplier<Long> work) {
        long[] value = new long[1];
        inTransaction(() -> value[0] = work.get());
        return value[0];
    }
}
