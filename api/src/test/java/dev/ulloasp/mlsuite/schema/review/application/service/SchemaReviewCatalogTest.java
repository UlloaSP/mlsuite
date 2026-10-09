package dev.ulloasp.mlsuite.schema.review.application.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.role.domain.model.RoleScope;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResult;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedback;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedbackType;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultStatus;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunStatus;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReview;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewAssignee;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewRun;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewRunSubmission;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;

/** A reviewer's inbox and an inference's review assignments, selected, counted and paged on PostgreSQL. */
class SchemaReviewCatalogTest extends PublicPredictionFixture {
    private static final String INBOX = "/api/schema-reviews/inbox";

    private final OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    private final List<SchemaReviewRun> cases = new ArrayList<>();
    private User colleague;
    private User bystander;
    private SchemaReview shared;
    private SchemaReviewRun colleaguesOnly;
    private SchemaReviewRun expired;

    /**
     * The owner and a colleague review "Case 00" to "Case 29": the owner has answered the first ten
     * and submitted the next three, the colleague has answered "Case 20". The owner also reviews one
     * run of the schema "Appetite", was assigned a review that expired, and is not in the
     * colleague's own review. A bystander may only see models.
     */
    @BeforeEach
    void reviews() {
        authorizeOwner();
        inTransaction(() -> {
            colleague = member("colleague", PermissionKey.REVIEW);
            bystander = member("bystander", PermissionKey.VIEW_MODELS);
            shared = review(schema, version, now.plusDays(30), owner, colleague);
            for (int i = 0; i < 30; i++) {
                SchemaReviewRun reviewRun = reviewRun(shared, version, "Case %02d".formatted(i));
                cases.add(reviewRun);
                if (i < 10 || i == 20) {
                    answer(reviewRun, i == 20 ? colleague : owner);
                } else if (i < 13) {
                    entityManager.persist(new SchemaReviewRunSubmission(reviewRun, owner, now.minusHours(i)));
                }
            }
            Schema appetite = new Schema(organization, "Appetite", null);
            entityManager.persist(appetite);
            SchemaVersion appetiteVersion = new SchemaVersion(appetite, 1, "First", Map.of("fields", List.of()));
            entityManager.persist(appetiteVersion);
            reviewRun(review(appetite, appetiteVersion, now.plusDays(30), owner), appetiteVersion, "Meal");
            colleaguesOnly = reviewRun(review(schema, version, now.plusDays(30), colleague), version, "Theirs");
            expired = reviewRun(review(schema, version, now.minusDays(1), owner), version, "Late");
            // One earlier creation time for every case leaves their order to the review run's public id.
            entityManager.createQuery("update PredictionRun r set r.createdAt = :at where r.schemaVersion.id = :id")
                    .setParameter("at", now.minusDays(2))
                    .setParameter("id", version.getId())
                    .executeUpdate();
        });
    }

    @Test
    void inboxRunsFilterByStateSearchAndCountTheWholeInbox() throws Exception {
        inbox(owner)
                .andExpect(jsonPath("$.totalItems").value(28))
                .andExpect(jsonPath("$.revisionCount").value(10))
                .andExpect(jsonPath("$.pendingCount").value(18))
                // The newest run comes first, with the results a reviewer answers on.
                .andExpect(jsonPath("$.items[0].run.name").value("Meal"))
                .andExpect(jsonPath("$.items[0].schemaName").value("Appetite"))
                .andExpect(jsonPath("$.items[0].reviewState").value("PENDING"))
                .andExpect(jsonPath("$.items[1].reviewId").value(shared.getPublicId()))
                .andExpect(jsonPath("$.items[1].run.results.length()").value(1));
        inbox(owner, "filter", "IN_PROGRESS", "size", "4", "page", "2")
                .andExpect(jsonPath("$.totalItems").value(10))
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].reviewState").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.revisionCount").value(10))
                .andExpect(jsonPath("$.pendingCount").value(18));
        inbox(owner, "filter", "PENDING").andExpect(jsonPath("$.totalItems").value(18));
        inbox(owner, "filter", "COMPLETED").andExpect(jsonPath("$.totalItems").value(0));
        inbox(owner, "filter", "unknown").andExpect(jsonPath("$.totalItems").value(0));
        inbox(owner, "search", "APPETITE")
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.pendingCount").value(18));
        inbox(owner, "search", "case 0").andExpect(jsonPath("$.totalItems").value(10));
        inbox(owner, "search", "case 1", "filter", "PENDING").andExpect(jsonPath("$.totalItems").value(7));
        inbox(owner, "search", "%").andExpect(jsonPath("$.totalItems").value(0));

        // Progress is each reviewer's own: the colleague sees every case, one of them started.
        inbox(colleague)
                .andExpect(jsonPath("$.totalItems").value(31))
                .andExpect(jsonPath("$.revisionCount").value(1));
        mockMvc.perform(signedIn(get(INBOX + "/runs/catalog"), bystander.getId())).andExpect(status().isForbidden());
    }

    @Test
    void inboxPagesKeepOneStableOrderAcrossPageBoundaries() throws Exception {
        List<String> paged = new ArrayList<>();
        for (int page = 0; page < 3; page++) {
            String body = inbox(owner, "size", "10", "page", String.valueOf(page))
                    .andExpect(jsonPath("$.hasNext").value(page < 2))
                    .andReturn().getResponse().getContentAsString();
            objectMapper.readTree(body).get("items").forEach(item -> paged.add(item.get("publicId").asText()));
        }
        assertEquals(28, paged.size());
        assertEquals(28, new TreeSet<>(paged).size());
        // After the newest run, runs created together follow in the order of their public ids.
        assertEquals(paged.subList(1, 28).stream().sorted().toList(), paged.subList(1, 28));
    }

    @Test
    void aRunOutsideTheInboxIsNotFound() throws Exception {
        mockMvc.perform(signedIn(get(INBOX + "/" + shared.getPublicId() + "/runs/" + cases.get(0).getPublicId()),
                owner.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewState").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.run.name").value("Case 00"))
                .andExpect(jsonPath("$.schemaName").value("Cardio risk"));
        for (SchemaReviewRun hidden : List.of(cases.get(10), colleaguesOnly, expired)) {
            String review = hidden.getReview().getPublicId();
            mockMvc.perform(signedIn(get(INBOX + "/" + review + "/runs/" + hidden.getPublicId()), owner.getId()))
                    .andExpect(status().isNotFound());
        }
        // The colleague has not submitted the run the owner completed, so it is still in their inbox.
        mockMvc.perform(signedIn(get(INBOX + "/" + shared.getPublicId() + "/runs/" + cases.get(10).getPublicId()),
                colleague.getId()))
                .andExpect(jsonPath("$.reviewState").value("PENDING"));
        mockMvc.perform(signedIn(get(INBOX + "/" + colleaguesOnly.getReview().getPublicId()), owner.getId()))
                .andExpect(status().isNotFound());
        mockMvc.perform(signedIn(get(INBOX + "/" + expired.getReview().getPublicId() + "/runs/catalog"),
                owner.getId()))
                .andExpect(status().isNotFound());
    }

    @Test
    void oneReviewIsSummarizedAndItsRunsPagedByState() throws Exception {
        String review = INBOX + "/" + shared.getPublicId();
        mockMvc.perform(signedIn(get(review), owner.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.schema.name").value("Cardio risk"))
                .andExpect(jsonPath("$.schemaVersion.bindings.length()").value(2))
                .andExpect(jsonPath("$.totalRuns").value(30))
                .andExpect(jsonPath("$.inProgressRuns").value(10))
                .andExpect(jsonPath("$.submittedRuns").value(3));
        reviewRuns("filter", "active", "size", "1")
                .andExpect(jsonPath("$.totalItems").value(27))
                .andExpect(jsonPath("$.items.length()").value(1));
        reviewRuns("filter", "all").andExpect(jsonPath("$.totalItems").value(30));
        // Submitted runs entered their state when they were submitted, the latest first.
        reviewRuns("filter", "COMPLETED")
                .andExpect(jsonPath("$.totalItems").value(3))
                .andExpect(jsonPath("$.items[0].run.name").value("Case 10"))
                .andExpect(jsonPath("$.items[0].submittedAt").isString())
                .andExpect(jsonPath("$.items[2].run.name").value("Case 12"));
        reviewRuns("search", String.valueOf(cases.get(29).getRun().getId()), "filter", "PENDING")
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].run.name").value("Case 29"));
    }

    @Test
    void submittingTheInboxCompletesTheStartedRunsOfTheCallerOnly() throws Exception {
        mockMvc.perform(signedIn(post(INBOX + "/submit-pending"), bystander.getId())).andExpect(status().isForbidden());
        mockMvc.perform(signedIn(post(INBOX + "/submit-pending"), owner.getId())).andExpect(status().isNoContent());

        inbox(owner)
                .andExpect(jsonPath("$.totalItems").value(18))
                .andExpect(jsonPath("$.revisionCount").value(0))
                .andExpect(jsonPath("$.pendingCount").value(18));
        mockMvc.perform(signedIn(get(INBOX + "/" + shared.getPublicId()), owner.getId()))
                .andExpect(jsonPath("$.submittedRuns").value(13));
        inbox(colleague).andExpect(jsonPath("$.revisionCount").value(1));
    }

    @Test
    void assignmentsOfAnInferenceAreCountedAndReadOneByOne() throws Exception {
        long submitted = cases.get(10).getRun().getId();
        String assignments = "/api/schema-reviews/inferences/" + submitted + "/assignments";
        mockMvc.perform(signedIn(get(assignments + "/counts"), owner.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.completed").value(1));
        mockMvc.perform(signedIn(get(assignments + "/catalog").param("filter", "COMPLETED"), owner.getId()))
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].reviewer.id").value(owner.getId()));
        String reviewRun = assignments + "/" + cases.get(10).getPublicId() + "/";
        mockMvc.perform(signedIn(get(reviewRun + owner.getId()), owner.getId()))
                .andExpect(jsonPath("$.reviewState").value("COMPLETED"));
        mockMvc.perform(signedIn(get(reviewRun + colleague.getId()), owner.getId()))
                .andExpect(jsonPath("$.reviewState").value("PENDING"));
        // A reviewer who is not assigned, and a review run of another inference, are not found.
        mockMvc.perform(signedIn(get(reviewRun + bystander.getId()), owner.getId())).andExpect(status().isNotFound());
        mockMvc.perform(signedIn(get(assignments + "/" + cases.get(0).getPublicId() + "/" + owner.getId()),
                owner.getId()))
                .andExpect(status().isNotFound());
        mockMvc.perform(signedIn(get(assignments + "/counts"), colleague.getId())).andExpect(status().isForbidden());
        mockMvc.perform(signedIn(get(reviewRun + owner.getId()), colleague.getId())).andExpect(status().isForbidden());
    }

    private User member(String name, PermissionKey permission) {
        String unique = name + "-" + schema.getId();
        User user = new User(unique, unique + "@test.example", "unused", name, SystemRole.USER);
        entityManager.persist(user);
        RoleDefinition role = new RoleDefinition(organization, RoleScope.ORGANIZATION, name, name, null);
        role.setPermissions(EnumSet.of(permission));
        entityManager.persist(role);
        entityManager.persist(new OrganizationMembership(organization, user, role, MembershipStatus.ACTIVE));
        user.setCurrentOrganization(organization);
        return user;
    }

    private SchemaReview review(Schema reviewed, SchemaVersion snapshot, OffsetDateTime expiresAt, User... reviewers) {
        SchemaReview review = new SchemaReview(organization, reviewed, snapshot, owner, expiresAt);
        entityManager.persist(review);
        for (User reviewer : reviewers) {
            entityManager.persist(new SchemaReviewAssignee(review, reviewer));
        }
        return review;
    }

    /** A run with one result, included in the review. */
    private SchemaReviewRun reviewRun(SchemaReview review, SchemaVersion snapshot, String name) {
        PredictionRun run = new PredictionRun(snapshot, name, Map.of(), PredictionRunStatus.SUCCESS);
        entityManager.persist(run);
        entityManager.persist(new PredictionResult(run, onnxModel, Map.of(), Map.of(), PredictionResultStatus.SUCCESS,
                null, null));
        SchemaReviewRun reviewRun = new SchemaReviewRun(review, run);
        entityManager.persist(reviewRun);
        return reviewRun;
    }

    private void answer(SchemaReviewRun reviewRun, User reviewer) {
        PredictionResult result = entityManager
                .createQuery("select r from PredictionResult r where r.run = :run", PredictionResult.class)
                .setParameter("run", reviewRun.getRun())
                .getSingleResult();
        entityManager.persist(new PredictionResultFeedback(result, reviewer, PredictionResultFeedbackType.OUTPUT, 0,
                objectMapper.valueToTree(Map.of("output-feedback-assessment", "high"))));
    }

    private ResultActions inbox(User reviewer, String... parameters) throws Exception {
        return page(INBOX + "/runs/catalog", reviewer, parameters);
    }

    private ResultActions reviewRuns(String... parameters) throws Exception {
        return page(INBOX + "/" + shared.getPublicId() + "/runs/catalog", owner, parameters);
    }

    private ResultActions page(String path, User reviewer, String... parameters) throws Exception {
        MockHttpServletRequestBuilder request = get(path);
        for (int index = 0; index < parameters.length; index += 2) {
            request.param(parameters[index], parameters[index + 1]);
        }
        return mockMvc.perform(signedIn(request, reviewer.getId())).andExpect(status().isOk());
    }
}
