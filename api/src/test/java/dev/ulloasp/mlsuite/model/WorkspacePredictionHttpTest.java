package dev.ulloasp.mlsuite.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.MultiValueMap;

import com.zaxxer.hikari.HikariDataSource;

import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;
import dev.ulloasp.mlsuite.security.auth.AuthenticatedUserPrincipal;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;

/**
 * A workspace member's predictions and explanations, over HTTP: the model is named by its
 * artifact's hash, no connection is held while the runtime works, and a run finding the
 * workspace share of the runtime in use is answered 503 (the fixture allows one at a time).
 */
class WorkspacePredictionHttpTest extends PublicPredictionFixture {

    private final List<MultiValueMap<String, HttpEntity<?>>> sent = new ArrayList<>();
    private final List<String> held = new ArrayList<>();

    @BeforeEach
    void signInTheOwner() {
        authorizeOwner();
    }

    @Test
    void aPredictionNamesTheModelByItsArtifactAndHoldsNoConnectionWhileTheRuntimeWorks() throws Exception {
        when(analyzer.post(eq("/predict"), any())).thenAnswer(call -> recorded(call.getArgument(1),
                Map.of("reports", List.of(CLASSIFIER))));

        mockMvc.perform(predicting())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reports[0].kind").value("classifier"));

        assertEquals(1, sent.size());
        assertEquals(FOREST_SHA256, artifact(sent.get(0)));
        assertNull(sent.get(0).getFirst("model_file"));
        assertEquals("{\"age\":52}", sent.get(0).getFirst("data").getBody());
        assertEquals(List.of("transaction false, connections 0"), held);
    }

    @Test
    void anExplanationHoldsNoConnectionWhileTheRuntimeWorks() throws Exception {
        when(analyzer.post(eq("/explain"), any())).thenAnswer(call -> recorded(call.getArgument(1),
                Map.of("reports", List.of(Map.of("kind", "Crystal Tree", "explanation", "age > 50")))));

        mockMvc.perform(signedIn(post("/api/analyzer/explanations")
                        .param("modelId", String.valueOf(forestModel.getId()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"instance\":{\"age\":52},\"traces\":[]}"), owner.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reports[0].explanation").value("age > 50"));

        assertEquals(FOREST_SHA256, artifact(sent.get(0)));
        assertEquals("[]", sent.get(0).getFirst("traces").getBody());
        assertEquals(List.of("transaction false, connections 0"), held);
    }

    @Test
    void aRunFindingTheWorkspaceShareInUseIsAnswered503AndTheNextOneRuns() throws Exception {
        CountDownLatch running = new CountDownLatch(1);
        CountDownLatch finish = new CountDownLatch(1);
        when(analyzer.post(eq("/predict"), any())).thenAnswer(call -> {
            running.countDown();
            assertTrue(finish.await(10, TimeUnit.SECONDS));
            return Map.of("reports", List.of(CLASSIFIER));
        });
        var first = CompletableFuture.supplyAsync(() -> {
            try {
                return mockMvc.perform(predicting()).andReturn().getResponse().getStatus();
            } catch (Exception failure) {
                throw new IllegalStateException(failure);
            }
        });
        assertTrue(running.await(10, TimeUnit.SECONDS));

        mockMvc.perform(predicting())
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value("Too many workspace runs are in progress. Try again in a moment."));

        finish.countDown();
        assertEquals(200, first.get(10, TimeUnit.SECONDS));
        mockMvc.perform(predicting()).andExpect(status().isOk());
    }

    @Test
    void aModelOfAnotherOrganizationIsNotRun() throws Exception {
        mockMvc.perform(predicting(999_999L)).andExpect(status().isNotFound());

        assertTrue(sent.isEmpty());
    }

    private MockMultipartHttpServletRequestBuilder predicting() {
        return predicting(forestModel.getId());
    }

    /** The form a workspace page sends, from the owner's session as signedIn leaves it. */
    private MockMultipartHttpServletRequestBuilder predicting(Long modelId) {
        var principal = new AuthenticatedUserPrincipal(owner.getId(), "member@example.test", "hash", SystemRole.USER, true);
        var session = new SecurityContextImpl(
                UsernamePasswordAuthenticationToken.authenticated(principal, null, principal.getAuthorities()));
        MockMultipartHttpServletRequestBuilder request = multipart("/api/analyzer/predictions")
                .file(new MockMultipartFile("data", "data.json", MediaType.APPLICATION_JSON_VALUE,
                        "{\"age\":52}".getBytes()));
        request.param("modelId", String.valueOf(modelId))
                .sessionAttr(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, session);
        return request;
    }

    private Map<String, Object> recorded(MultiValueMap<String, HttpEntity<?>> parts, Map<String, Object> answer)
            throws Exception {
        sent.add(parts);
        held.add("transaction " + TransactionSynchronizationManager.isActualTransactionActive() + ", connections "
                + dataSource.unwrap(HikariDataSource.class).getHikariPoolMXBean().getActiveConnections());
        return answer;
    }
}
