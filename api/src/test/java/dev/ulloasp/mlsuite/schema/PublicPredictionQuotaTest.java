package dev.ulloasp.mlsuite.schema;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.lessThanOrEqualTo;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.web.context.request.ServletWebRequest;

import dev.ulloasp.mlsuite.model.domain.exception.AnalyzerServiceException;
import dev.ulloasp.mlsuite.schema.application.dto.PublicPredictionRequest;
import dev.ulloasp.mlsuite.schema.application.dto.PublicRunQuotaDto;
import dev.ulloasp.mlsuite.schema.application.service.PublicPredictionQuota;
import dev.ulloasp.mlsuite.schema.domain.exception.PublicRunLimitException;
import dev.ulloasp.mlsuite.schema.domain.model.BookmarkVisibility;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.security.auth.AuthenticatedUserPrincipal;
import dev.ulloasp.mlsuite.security.identity.PublicCaller;
import dev.ulloasp.mlsuite.security.identity.PublicCallerArgumentResolver;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;

/**
 * The quota of public runs: the count itself against a clock the test moves, then the running
 * application with three runs for a network without a session and five for an account.
 */
@TestPropertySource(properties = {
        "mlsuite.public-prediction.anonymous-runs-per-day=3",
        "mlsuite.public-prediction.signed-in-runs-per-day=5" })
class PublicPredictionQuotaTest extends PublicPredictionFixture {

    private static final Instant START = Instant.parse("2026-10-06T10:00:00Z");
    private static final PublicCaller OTHER_VISITOR = new PublicCaller(false, "address:other");
    private static final PublicCaller MEMBER = new PublicCaller(true, "user:7");
    private static final String CLIENT_ADDRESS = PublicCallerArgumentResolver.CLIENT_ADDRESS_HEADER;

    private final MovingClock clock = new MovingClock();

    @Test
    void eachCallerHasItsOwnCountOnEachBookmarkAndAnAccountAHigherOne() {
        PublicPredictionQuota quota = new PublicPredictionQuota(2, 4, 100, clock);

        quota.admit(VISITOR, "a");
        quota.admit(VISITOR, "a");

        PublicRunLimitException refused = assertThrows(PublicRunLimitException.class, () -> quota.admit(VISITOR, "a"));
        assertFalse(refused.isSignedIn());
        assertEquals(2, refused.getLimit());
        assertEquals(new PublicRunQuotaDto(2, 0, START.plus(Duration.ofHours(24))), quota.status(VISITOR, "a"));
        assertEquals(new PublicRunQuotaDto(2, 2, null), quota.status(VISITOR, "b"));
        assertEquals(new PublicRunQuotaDto(2, 2, null), quota.status(OTHER_VISITOR, "a"));
        for (int run = 0; run < 4; run++) quota.admit(MEMBER, "a");
        assertTrue(assertThrows(PublicRunLimitException.class, () -> quota.admit(MEMBER, "a")).isSignedIn());
        assertEquals(new PublicRunQuotaDto(4, 4, null), quota.status(new PublicCaller(true, "user:8"), "a"));
    }

    @Test
    void theCountStartsAgainTwentyFourHoursAfterTheFirstCountedRun() {
        PublicPredictionQuota quota = new PublicPredictionQuota(2, 4, 100, clock);
        quota.admit(VISITOR, "a");
        clock.advance(Duration.ofHours(5));
        quota.admit(VISITOR, "a");

        clock.advance(Duration.ofHours(19).minusSeconds(1));
        PublicRunLimitException refused = assertThrows(PublicRunLimitException.class, () -> quota.admit(VISITOR, "a"));
        assertEquals(START.plus(Duration.ofHours(24)), refused.getResetsAt());
        assertEquals(Duration.ofSeconds(1), refused.getRetryAfter());

        clock.advance(Duration.ofSeconds(1));
        assertEquals(new PublicRunQuotaDto(2, 2, null), quota.status(VISITOR, "a"));
        quota.admit(VISITOR, "a");
        assertEquals(new PublicRunQuotaDto(2, 1, START.plus(Duration.ofHours(48))), quota.status(VISITOR, "a"));
    }

    @Test
    void aRunGivenBackIsNotCountedAndLeavesNoWindowBehind() {
        PublicPredictionQuota quota = new PublicPredictionQuota(2, 4, 100, clock);
        quota.admit(VISITOR, "a");
        quota.admit(VISITOR, "a");

        quota.giveBack(VISITOR, "a");
        assertEquals(new PublicRunQuotaDto(2, 1, START.plus(Duration.ofHours(24))), quota.status(VISITOR, "a"));
        quota.giveBack(VISITOR, "a");
        assertEquals(new PublicRunQuotaDto(2, 2, null), quota.status(VISITOR, "a"));
    }

    @Test
    void theCountsKeptAreBoundedByForgettingTheOldest() {
        PublicPredictionQuota quota = new PublicPredictionQuota(1, 1, 2, clock);
        PublicCaller third = new PublicCaller(false, "address:third");
        quota.admit(VISITOR, "a");
        clock.advance(Duration.ofMinutes(1));
        quota.admit(OTHER_VISITOR, "a");
        clock.advance(Duration.ofMinutes(1));

        // No room for a third window: the oldest goes, and a new caller is never turned away for it.
        quota.admit(third, "a");

        assertEquals(1, quota.status(VISITOR, "a").remaining());
        assertEquals(0, quota.status(OTHER_VISITOR, "a").remaining());
        assertEquals(0, quota.status(third, "a").remaining());
        // A window that expired makes the room, so the one still counting beside it is kept.
        clock.advance(Duration.ofHours(24).minusMinutes(1));
        quota.admit(VISITOR, "a");
        assertEquals(0, quota.status(third, "a").remaining());
    }

    @Test
    void aLimitBelowOneIsRefusedWhenTheApplicationStarts() {
        assertThrows(IllegalArgumentException.class, () -> new PublicPredictionQuota(0, 4, 100, clock));
        assertThrows(IllegalArgumentException.class, () -> new PublicPredictionQuota(2, 0, 100, clock));
    }

    @Test
    void aCallerWithoutASessionIsItsNetworkAndTheAddressIsNeverKept() {
        PublicCallerArgumentResolver resolver = new PublicCallerArgumentResolver();

        PublicCaller caller = caller(resolver, "203.0.113.9", null);

        assertFalse(caller.signedIn());
        assertFalse(caller.key().contains("203.0.113.9"), caller.key());
        assertEquals(caller, caller(resolver, "203.0.113.9", null));
        assertNotEquals(caller, caller(resolver, "203.0.113.10", null));
        // The key of the hash is drawn at startup, so a hash names nothing outside this process.
        assertNotEquals(caller, caller(new PublicCallerArgumentResolver(), "203.0.113.9", null));
        // The header nginx sets wins over the socket, which behind nginx is nginx itself.
        assertEquals(caller, caller(resolver, "172.18.0.5", "203.0.113.9"));
        // One IPv6 customer holds a whole /64 and is one caller.
        PublicCaller inet6 = caller(resolver, "172.18.0.5", "2001:db8:1:2::1");
        assertEquals(inet6, caller(resolver, "172.18.0.5", "2001:db8:1:2:ffff::9"));
        assertNotEquals(inet6, caller(resolver, "172.18.0.5", "2001:db8:1:3::1"));
    }

    @Test
    void aRunThatIsRefusedBeforeTheRuntimeCostsNothing() throws Exception {
        String publicId = bookmark.getPublicId();
        setVisibility(BookmarkVisibility.PRIVATE);
        assertEquals(404, refused(publicId, request(Map.of("in0", 52))).getStatusCode().value());
        mockMvc.perform(get("/api/public/bookmarks/{publicId}/quota", publicId)).andExpect(status().isNotFound());
        setVisibility(BookmarkVisibility.PUBLIC);

        assertEquals(409, refused(publicId, new PublicPredictionRequest(version.getVersion() - 1, Map.of()))
                .getStatusCode().value());
        assertEquals(400, refused(publicId, request(Map.of("in9", 1))).getStatusCode().value());
        run(publicId, "{\"values\":{\"in0\":52}}").andExpect(status().isBadRequest());

        assertEquals(new PublicRunQuotaDto(3, 3, null), service.quota(publicId, VISITOR));
        quota(publicId).andExpect(jsonPath("$.remaining").value(3)).andExpect(jsonPath("$.resetsAt").isEmpty());
    }

    @Test
    void aRunTheServerCouldNotPerformIsGivenBackAndOneTheRuntimeAnsweredCounts() throws Exception {
        String publicId = bookmark.getPublicId();
        when(analyzer.post(eq("/predict"), any())).thenThrow(new AnalyzerServiceException(500, "boom"));
        assertEquals(502, refused(publicId, request(Map.of("in0", 52))).getStatusCode().value());
        assertEquals(new PublicRunQuotaDto(3, 3, null), service.quota(publicId, VISITOR));

        CountDownLatch running = new CountDownLatch(1);
        CountDownLatch finish = new CountDownLatch(1);
        when(analyzer.post(eq("/predict"), any())).thenAnswer(call -> {
            running.countDown();
            assertTrue(finish.await(10, TimeUnit.SECONDS));
            return Map.of("reports", List.of(CLASSIFIER));
        });
        var first = CompletableFuture.supplyAsync(() -> run(publicId, request(Map.of("in0", 52))));
        assertTrue(running.await(10, TimeUnit.SECONDS));
        assertEquals(503, refused(publicId, request(Map.of("in0", 52))).getStatusCode().value());
        finish.countDown();
        assertEquals(2, first.get(10, TimeUnit.SECONDS).quota().remaining());
        assertEquals(2, service.quota(publicId, VISITOR).remaining());

        when(analyzer.post(eq("/predict"), any())).thenThrow(new AnalyzerServiceException(400, "Missing features"));
        assertEquals(422, refused(publicId, request(Map.of("in0", 52))).getStatusCode().value());
        assertEquals(1, service.quota(publicId, VISITOR).remaining());
    }

    @Test
    void aVisitorWithoutASessionIsStoppedAtTheLimitWhateverTheyClaimToBe() throws Exception {
        String publicId = bookmark.getPublicId();
        quota(publicId).andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$.limit").value(3))
                .andExpect(jsonPath("$.remaining").value(3))
                .andExpect(jsonPath("$.resetsAt").isEmpty());

        for (int remaining = 2; remaining >= 0; remaining--) {
            run(publicId).andExpect(status().isOk())
                    .andExpect(jsonPath("$.quota.limit").value(3))
                    .andExpect(jsonPath("$.quota.remaining").value(remaining))
                    .andExpect(jsonPath("$.quota.resetsAt").isString());
        }
        verify(analyzer, times(6)).post(eq("/predict"), any());

        run(publicId).andExpect(status().isTooManyRequests())
                .andExpect(refusal -> assertThat(Long.parseLong(refusal.getResponse().getHeader("Retry-After")),
                        allOf(greaterThan(0L), lessThanOrEqualTo(86_400L))))
                .andExpect(jsonPath("$.length()").value(6))
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.code").value("ANONYMOUS_RUN_LIMIT_REACHED"))
                .andExpect(jsonPath("$.message").value("You have used the 3 runs this bookmark allows without an "
                        + "account in 24 hours. Sign in for more."))
                .andExpect(jsonPath("$.path").value("/api/public/bookmarks/" + publicId + "/predictions"))
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.quota.limit").value(3))
                .andExpect(jsonPath("$.quota.remaining").value(0))
                .andExpect(jsonPath("$.quota.resetsAt").isString());
        // X-Forwarded-For is the client's to write, so it names nobody.
        mockMvc.perform(runRequest(publicId).header("X-Forwarded-For", "198.51.100.7"))
                .andExpect(status().isTooManyRequests());
        verify(analyzer, times(6)).post(eq("/predict"), any());
        // Another bookmark, and another network as nginx reports it, have their own counts.
        quota(other().getPublicId()).andExpect(jsonPath("$.remaining").value(3));
        mockMvc.perform(runRequest(publicId).header(CLIENT_ADDRESS, "198.51.100.7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quota.remaining").value(2));
    }

    @Test
    void aSignedInUserIsCountedByAccountWithTheHigherLimit() throws Exception {
        String publicId = bookmark.getPublicId();
        for (int run = 0; run < 3; run++) run(publicId).andExpect(status().isOk());
        run(publicId).andExpect(status().isTooManyRequests());

        // Signing in from the exhausted network starts the account's own, higher count.
        mockMvc.perform(signedIn(get("/api/public/bookmarks/{publicId}/quota", publicId), 7L))
                .andExpect(jsonPath("$.limit").value(5))
                .andExpect(jsonPath("$.remaining").value(5));
        for (int remaining = 4; remaining >= 0; remaining--) {
            // The account is counted wherever it connects from.
            mockMvc.perform(signedIn(runRequest(publicId), 7L).header(CLIENT_ADDRESS, "198.51.100." + remaining))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.quota.limit").value(5))
                    .andExpect(jsonPath("$.quota.remaining").value(remaining));
        }
        mockMvc.perform(signedIn(runRequest(publicId), 7L))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.code").value("SIGNED_IN_RUN_LIMIT_REACHED"))
                .andExpect(jsonPath("$.message").value("You have used the 5 runs an account gets on this bookmark "
                        + "in 24 hours."))
                .andExpect(jsonPath("$.quota.limit").value(5))
                .andExpect(jsonPath("$.quota.remaining").value(0));
        mockMvc.perform(signedIn(runRequest(publicId), 8L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quota.remaining").value(4));
    }

    private SchemaBookmark other() {
        SchemaBookmark[] other = new SchemaBookmark[1];
        inTransaction(() -> {
            other[0] = new SchemaBookmark(schema, version, "staging");
            other[0].setVisibility(BookmarkVisibility.PUBLIC);
            other[0].setPublicId(bookmark.getPublicId() + "-staging");
            entityManager.persist(other[0]);
        });
        return other[0];
    }

    private void setVisibility(BookmarkVisibility visibility) {
        inTransaction(() -> entityManager.find(SchemaBookmark.class, bookmark.getId()).setVisibility(visibility));
    }

    private ResultActions quota(String publicId) throws Exception {
        return mockMvc.perform(get("/api/public/bookmarks/{publicId}/quota", publicId)).andExpect(status().isOk());
    }

    private ResultActions run(String publicId) throws Exception {
        return mockMvc.perform(runRequest(publicId));
    }

    private ResultActions run(String publicId, String body) throws Exception {
        return mockMvc.perform(post("/api/public/bookmarks/{publicId}/predictions", publicId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private MockHttpServletRequestBuilder runRequest(String publicId) {
        return post("/api/public/bookmarks/{publicId}/predictions", publicId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":" + version.getVersion() + ",\"values\":{\"in0\":52}}");
    }

    /** A logged-in session, as the login endpoint leaves it for the filter chain to read. */
    private static MockHttpServletRequestBuilder signedIn(MockHttpServletRequestBuilder request, long userId) {
        var principal = new AuthenticatedUserPrincipal(userId, "member@example.test", "hash", SystemRole.USER, true);
        var authentication = UsernamePasswordAuthenticationToken.authenticated(
                principal, null, principal.getAuthorities());
        return request.sessionAttr(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                new SecurityContextImpl(authentication));
    }

    private static PublicCaller caller(PublicCallerArgumentResolver resolver, String socket, String header) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr(socket);
        if (header != null) request.addHeader(CLIENT_ADDRESS, header);
        return resolver.resolveArgument(null, null, new ServletWebRequest(request), null);
    }

    private static final class MovingClock extends Clock {
        private Instant now = START;

        void advance(Duration duration) {
            now = now.plus(duration);
        }

        @Override
        public Instant instant() {
            return now;
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }
    }
}
