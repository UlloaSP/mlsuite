package dev.ulloasp.mlsuite.admin.purge;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationCatalogItemDto;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaCatalogItemDto;
import dev.ulloasp.mlsuite.schema.domain.model.BookmarkVisibility;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResult;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultStatus;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunStatus;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaModelBinding;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReview;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewAssignee;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewRun;
import dev.ulloasp.mlsuite.support.TestFixtures;
import dev.ulloasp.mlsuite.user.domain.model.DeletedUser;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;

/**
 * A purge removes bookmarks and accounts in batched SQL that no entity sees, so it is the database
 * that keeps a pin or an avatar from outliving them, on PostgreSQL with its real foreign keys.
 * Until a batch reaches them, what a purge closed is no longer readable on any profile.
 */
class PurgeProfileRowsTest extends PublicPredictionFixture {

    private static final String PROFILE = "/api/public/users/{handle}";

    @Autowired PurgeRequestService purges;
    @Autowired PurgeWorker worker;
    @Autowired PurgeLedger ledger;

    private JdbcTemplate jdbc;
    private User superadmin;
    private User person;
    private Organization account;

    @BeforeEach
    void aPersonWithAPublicProfile() {
        jdbc = new JdbcTemplate(dataSource);
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        inTransaction(() -> {
            superadmin = new User("root-" + suffix, "root-" + suffix + "@example.test", "x", "Root", SystemRole.SUPERADMIN);
            person = new User("ada-" + suffix, "ada-" + suffix + "@example.test", "x", "Ada", SystemRole.USER);
            entityManager.persist(superadmin);
            entityManager.persist(person);
            account = Organization.personal(person);
            entityManager.persist(account);
        });
    }

    private SchemaBookmark published(Organization owner, String name, Model bound) {
        AtomicReference<SchemaBookmark> stored = new AtomicReference<>();
        inTransaction(() -> {
            Schema owned = new Schema(owner, name, null);
            entityManager.persist(owned);
            SchemaVersion snapshot = new SchemaVersion(owned, 1, "First", Map.of("fields", List.of(), "reports", List.of()));
            entityManager.persist(snapshot);
            if (bound != null) entityManager.persist(new SchemaModelBinding(snapshot, bound, Map.of()));
            SchemaBookmark pinnable = new SchemaBookmark(owned, snapshot, name);
            pinnable.setVisibility(BookmarkVisibility.PUBLIC);
            pinnable.setPublicId(UUID.randomUUID().toString());
            entityManager.persist(pinnable);
            stored.set(pinnable);
        });
        return stored.get();
    }

    private void pinned(Long userId, SchemaBookmark pin, int slot) {
        jdbc.update("INSERT INTO profile_pin (schema_bookmark_id, user_id, slot) VALUES (?, ?, ?)", pin.getId(), userId, slot);
    }

    private long rows(String table, String column, Long value) {
        return jdbc.queryForObject("SELECT count(*) FROM " + table + " WHERE " + column + " = ?", Long.class, value);
    }

    /** Asks for the purge, runs it to the end on the worker, and fails on anything but completion. */
    private void purged(PurgeScope scope, Long id, String confirmation) {
        PurgeJobDto job = purges.request(superadmin.getId(), new RequestPurgeRequest(scope, id, confirmation));
        worker.work();
        assertEquals(PurgeStatus.COMPLETED, ledger.find(job.id()).orElseThrow().status());
    }

    @Test
    void theRowsAreTiedToWhatTheyDescribeByTheDatabase() {
        for (String constraint : List.of("fk_profile_pin_bookmark", "fk_profile_pin_user", "fk_user_avatar_user")) {
            assertEquals("c", jdbc.queryForObject(
                    "SELECT confdeltype::text FROM pg_constraint WHERE conname = ?", String.class, constraint), constraint);
        }
    }

    @Test
    void aPurgedSchemaTakesItsPinAndLeavesThePersonsOthersInOrder() throws Exception {
        SchemaBookmark first = published(account, "first", null);
        SchemaBookmark purgedOne = published(account, "purged", null);
        SchemaBookmark last = published(account, "last", null);
        pinned(person.getId(), first, 0);
        pinned(person.getId(), purgedOne, 1);
        pinned(person.getId(), last, 2);

        purges.request(superadmin.getId(), new RequestPurgeRequest(PurgeScope.SCHEMA, purgedOne.getSchema().getId(), "purged"));
        mockMvc.perform(get(PROFILE, person.getUsername())).andExpect(jsonPath("$.pinned.length()").value(2));
        assertEquals(3, rows("profile_pin", "user_id", person.getId()));
        worker.work();

        assertEquals(0, rows("profile_pin", "schema_bookmark_id", purgedOne.getId()));
        mockMvc.perform(get(PROFILE, person.getUsername()))
                .andExpect(jsonPath("$.pinned.length()").value(2))
                .andExpect(jsonPath("$.pinned[0].name").value("first"))
                .andExpect(jsonPath("$.pinned[1].name").value("last"));
    }

    @Test
    void aPurgedModelTakesThePinOfEverySnapshotThatBindsIt() {
        AtomicReference<Model> stored = new AtomicReference<>();
        inTransaction(() -> {
            Model model = new Model(person, "own-model", "classifier", "Estimator", "own.mlbundle");
            model.setOrganization(account);
            entityManager.persist(TestFixtures.storedArtifact(model, "own-artifact".getBytes()));
            stored.set(model);
        });
        SchemaBookmark bound = published(account, "bound", stored.get());
        pinned(person.getId(), bound, 0);

        purged(PurgeScope.MODEL, stored.get().getId(), "own-model");

        assertEquals(0, rows("schema_bookmark", "id", bound.getId()));
        assertEquals(0, rows("profile_pin", "user_id", person.getId()));
    }

    /** The app pins personal accounts' bookmarks alone: this row is written by hand to prove the key. */
    @Test
    void aPurgedOrganizationLeavesNoPinBehind() {
        pinned(person.getId(), bookmark, 0);

        purged(PurgeScope.ORGANIZATION, organization.getId(), "Acme Health");

        assertEquals(0, rows("profile_pin", "user_id", person.getId()));
        assertEquals(1, rows("app_user", "id", person.getId()));
    }

    @Test
    void aPurgedAccountTakesItsPinsAndItsAvatarAndIsGoneFromTheStart() throws Exception {
        SchemaBookmark pin = published(account, "shown", null);
        pinned(person.getId(), pin, 0);
        jdbc.update("""
                INSERT INTO user_avatar (user_id, content, content_type, updated_at)
                VALUES (?, '\\x89'::bytea, 'image/png', now())""", person.getId());

        PurgeJobDto job = purges.request(superadmin.getId(),
                new RequestPurgeRequest(PurgeScope.USER, person.getId(), person.getUsername()));
        mockMvc.perform(get(PROFILE, person.getUsername())).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/public/bookmarks/{id}", pin.getPublicId())).andExpect(status().isNotFound());
        worker.work();

        assertEquals(PurgeStatus.COMPLETED, ledger.find(job.id()).orElseThrow().status());
        assertEquals(0, rows("app_user", "id", person.getId()));
        assertEquals(0, rows("user_avatar", "user_id", person.getId()));
        assertEquals(0, rows("profile_pin", "user_id", person.getId()));
        assertEquals(0, rows("profile_pin", "schema_bookmark_id", pin.getId()));
    }

    @Test
    void anAuthorWhoIsGoneReadsAsDeletedWithNoPictureWhereverAnAvatarWouldBe() throws Exception {
        authorizeOwner();
        Long[] run = new Long[1];
        inTransaction(() -> {
            PredictionRun reviewed = new PredictionRun(bookmark, version, "reviewed-" + UUID.randomUUID(), Map.of(),
                    PredictionRunStatus.SUCCESS);
            entityManager.persist(reviewed);
            entityManager.persist(new PredictionResult(reviewed, entityManager.find(Model.class, forestModel.getId()),
                    Map.of(), Map.of(), PredictionResultStatus.SUCCESS, null, null));
            SchemaReview review = new SchemaReview(entityManager.getReference(Organization.class, organization.getId()),
                    schema, version, owner, OffsetDateTime.now().plusDays(1));
            entityManager.persist(review);
            entityManager.persist(new SchemaReviewAssignee(review, owner));
            entityManager.persist(new SchemaReviewRun(review, reviewed));
            run[0] = reviewed.getId();
        });
        jdbc.update("UPDATE schema_review SET created_by_user_id = NULL WHERE organization_id = ?", organization.getId());
        jdbc.update("UPDATE model SET user_id = NULL, updated_by_user_id = NULL WHERE id = ?", forestModel.getId());
        jdbc.update("UPDATE app_user SET avatar_updated_at = now() WHERE id = ?", owner.getId());

        mockMvc.perform(signedIn(get("/api/schema-reviews/inferences/{run}/assignments/catalog", run[0]), owner.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].createdBy.fullName").value(DeletedUser.NAME))
                .andExpect(jsonPath("$.items[0].reviewer.avatarUrl").isNotEmpty());
        mockMvc.perform(signedIn(get("/api/models/{id}", forestModel.getId()), owner.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.updatedByName").value(DeletedUser.NAME))
                .andExpect(jsonPath("$.updatedByAvatarUrl").isEmpty());

        SchemaCatalogItemDto authorless = SchemaCatalogItemDto.from(new Schema(organization, "Gone", null), null, 0);
        assertEquals(DeletedUser.NAME, authorless.updatedByName());
        assertNull(authorless.updatedByAvatarUrl());
        assertNull(OrganizationCatalogItemDto.from(new Organization("gone", "Gone", null, null), DeletedUser.NAME, null,
                null, 0, 0, 0, 0, 0).updatedByAvatarUrl());
    }
}
