package dev.ulloasp.mlsuite.schema;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkSummaryDto;
import dev.ulloasp.mlsuite.schema.application.service.BookmarkPublishability;
import dev.ulloasp.mlsuite.schema.application.service.PublicBookmarkService;
import dev.ulloasp.mlsuite.schema.domain.model.BookmarkVisibility;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.util.PageDto;
import jakarta.persistence.EntityManager;

/** The public feed against a real database: what is listed, found, ordered and paged. */
@DataJpaTest(properties = {
        "spring.profiles.active=test", "logging.file.name=target/public-bookmark-feed-test.log",
        "spring.datasource.url=jdbc:h2:mem:publicfeed;MODE=PostgreSQL;INIT=CREATE DOMAIN IF NOT EXISTS TIMESTAMPTZ AS TIMESTAMP WITH TIME ZONE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop", "spring.flyway.enabled=false"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({ PublicBookmarkService.class, BookmarkPublishability.class })
@ContextConfiguration(classes = PublicBookmarkFeedServiceTest.PersistenceConfig.class)
class PublicBookmarkFeedServiceTest {

    @Configuration
    @EntityScan("dev.ulloasp.mlsuite")
    @EnableJpaRepositories("dev.ulloasp.mlsuite")
    static class PersistenceConfig {
    }

    private static final OffsetDateTime DAY = OffsetDateTime.parse("2026-10-01T10:00:00Z");

    @Autowired
    EntityManager entityManager;
    @Autowired
    PublicBookmarkService service;

    private SchemaBookmark cardio;
    private SchemaBookmark churn;
    private SchemaBookmark draft;
    private SchemaBookmark archived;

    @BeforeEach
    void setUp() {
        User owner = new User("qa", "qa@example.test", "unused", "QA", SystemRole.USER);
        entityManager.persist(owner);
        Organization acme = organization("acme", "Acme Health", owner);
        Organization globex = organization("globex", "Globex Retail", owner);

        cardio = bookmark(schema(acme, "Cardio risk", "Estimates cardiovascular risk."), "production",
                BookmarkVisibility.PUBLIC, DAY.plusDays(1));
        churn = bookmark(schema(globex, "Churn", null), "Beta", BookmarkVisibility.PUBLIC, DAY.plusDays(2));
        draft = bookmark(schema(acme, "Internal triage", "Estimates triage priority."), "staging",
                BookmarkVisibility.PRIVATE, DAY.plusDays(3));
        Schema retired = schema(globex, "Retired risk", "Estimates nothing any more.");
        retired.setArchivedAt(DAY);
        archived = bookmark(retired, "legacy", BookmarkVisibility.PUBLIC, DAY.plusDays(4));
    }

    @Test
    void listsOnlyPublishedBookmarksOfActiveSchemasFromEveryOrganization() {
        PageDto<PublicBookmarkSummaryDto> page = service.getPublishedBookmarkPage(0, 24, "", "updated");

        assertEquals(List.of(churn.getPublicId(), cardio.getPublicId()), publicIds(page));
        assertEquals(2, page.totalItems());
        assertFalse(page.hasNext());
        assertEquals(new PublicBookmarkSummaryDto(cardio.getPublicId(), "production", "Cardio risk",
                "Estimates cardiovascular risk.", 3, "Baseline", "Acme Health", page.items().get(1).updatedAt()),
                page.items().get(1));
        assertEquals("Globex Retail", page.items().get(0).organizationName());
    }

    @Test
    void aCardCarriesNothingBeyondWhatItShows() throws Exception {
        ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());
        PublicBookmarkSummaryDto card = service.getPublishedBookmarkPage(0, 24, "cardio", "updated").items().get(0);

        assertEquals(Set.of("publicId", "name", "schemaName", "schemaDescription", "version", "versionName",
                "organizationName", "updatedAt"), mapper.convertValue(card, Map.class).keySet());
        assertFalse(mapper.writeValueAsString(card).contains("qa@example.test"));
    }

    @Test
    void searchMatchesNameSchemaDescriptionAndPublisherButNeverPrivateOrArchivedOnes() {
        assertEquals(List.of(churn.getPublicId()), publicIds(search("beta")));
        assertEquals(List.of(cardio.getPublicId()), publicIds(search("CARDIO")));
        assertEquals(List.of(cardio.getPublicId()), publicIds(search("  cardiovascular ")));
        assertEquals(List.of(churn.getPublicId()), publicIds(search("globex")));
        // "Estimates" is in the private and archived descriptions too; "staging" and "legacy" name them.
        assertEquals(List.of(cardio.getPublicId()), publicIds(search("estimates")));
        assertTrue(search("staging").items().isEmpty());
        assertTrue(search("legacy").items().isEmpty());
        assertTrue(search("no such bookmark").items().isEmpty());
    }

    @Test
    void ordersByNameOrByLatestUpdateAndPagesTheResult() {
        assertEquals(List.of(churn.getPublicId(), cardio.getPublicId()),
                publicIds(service.getPublishedBookmarkPage(0, 24, "", "name")));
        assertEquals(List.of(churn.getPublicId(), cardio.getPublicId()),
                publicIds(service.getPublishedBookmarkPage(0, 24, "", "unknown-sort")));

        PageDto<PublicBookmarkSummaryDto> first = service.getPublishedBookmarkPage(0, 1, "", "updated");
        assertEquals(List.of(churn.getPublicId()), publicIds(first));
        assertEquals(2, first.totalItems());
        assertTrue(first.hasNext());
        PageDto<PublicBookmarkSummaryDto> second = service.getPublishedBookmarkPage(1, 1, "", "updated");
        assertEquals(List.of(cardio.getPublicId()), publicIds(second));
        assertFalse(second.hasNext());
    }

    @Test
    void theSameRuleDecidesWhichPublicPagesExist() {
        assertEquals("production", service.getPublishedBookmark(cardio.getPublicId()).name());
        for (SchemaBookmark hidden : List.of(draft, archived)) {
            assertEquals(404, assertThrows(ResponseStatusException.class,
                    () -> service.getPublishedBookmark(hidden.getPublicId())).getStatusCode().value());
        }
    }

    private PageDto<PublicBookmarkSummaryDto> search(String search) {
        return service.getPublishedBookmarkPage(0, 24, search, "updated");
    }

    private static List<String> publicIds(PageDto<PublicBookmarkSummaryDto> page) {
        return page.items().stream().map(PublicBookmarkSummaryDto::publicId).toList();
    }

    private Organization organization(String slug, String name, User owner) {
        Organization organization = new Organization(slug, name, null, null, owner);
        entityManager.persist(organization);
        return organization;
    }

    private Schema schema(Organization organization, String name, String description) {
        Schema schema = new Schema(organization, name, description);
        entityManager.persist(schema);
        return schema;
    }

    /** Every bookmark has a public id, as one that was published once and unpublished does. */
    private SchemaBookmark bookmark(Schema schema, String name, BookmarkVisibility visibility, OffsetDateTime updatedAt) {
        SchemaVersion version = new SchemaVersion(schema, 3, "Baseline", Map.of());
        entityManager.persist(version);
        SchemaBookmark bookmark = new SchemaBookmark(schema, version, name);
        bookmark.setVisibility(visibility);
        bookmark.setPublicId(UUID.randomUUID().toString());
        entityManager.persist(bookmark);
        entityManager.flush();
        // The update timestamp is managed by Hibernate, so a known one is written past it.
        entityManager.createQuery("UPDATE SchemaBookmark b SET b.updatedAt = :at WHERE b.id = :id")
                .setParameter("at", updatedAt).setParameter("id", bookmark.getId()).executeUpdate();
        return bookmark;
    }
}
