package dev.ulloasp.mlsuite.schema;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.plugin.application.dto.PluginRuntimeSourceDto;
import dev.ulloasp.mlsuite.plugin.application.port.in.ListPluginRuntimeSourcesUseCase;
import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkSummaryDto;
import dev.ulloasp.mlsuite.schema.application.service.BookmarkPublishability;
import dev.ulloasp.mlsuite.schema.application.service.PublicBookmarkService;
import dev.ulloasp.mlsuite.schema.domain.model.BookmarkVisibility;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaModelBinding;
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
    @MockitoBean
    ListPluginRuntimeSourcesUseCase plugins;

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

        cardio = bookmark(schema(acme, "Cardio risk", "Internal notes on the cohort."), "production",
                "Estimates cardiovascular risk.", BookmarkVisibility.PUBLIC, DAY.plusDays(1));
        cardio.getVersion().setFormSchema(Map.of(
                "fields", List.of(
                        Map.of("kind", "number", "label", "Age", "mappedTo", "age"),
                        Map.of("kind", "number", "label", "Income", "mappedTo", "income"),
                        Map.of("kind", "number", "label", "Site", "hidden", true, "mappedTo", "site")),
                "reports", List.of(Map.of("kind", "classifier", "label", "Risk", "mappedTo", "prediction"))));
        for (String name : List.of("risk-model", "risk-net")) {
            Model model = new Model(owner, name, "classifier", "Estimator", name + ".bin", new byte[] { 1 });
            model.setOrganization(acme);
            entityManager.persist(model);
            entityManager.persist(new SchemaModelBinding(cardio.getVersion(), model, Map.of()));
        }
        entityManager.flush();
        churn = bookmark(schema(globex, "Churn", "Scores churn."), "Beta", null,
                BookmarkVisibility.PUBLIC, DAY.plusDays(2));
        draft = bookmark(schema(acme, "Internal triage", null), "staging", "Estimates triage priority.",
                BookmarkVisibility.PRIVATE, DAY.plusDays(3));
        Schema retired = schema(globex, "Retired risk", null);
        retired.setArchivedAt(DAY);
        archived = bookmark(retired, "legacy", "Estimates nothing any more.",
                BookmarkVisibility.PUBLIC, DAY.plusDays(4));
    }

    @Test
    void listsOnlyPublishedBookmarksOfActiveSchemasFromEveryOrganization() {
        PageDto<PublicBookmarkSummaryDto> page = service.getPublishedBookmarkPage(0, 24, "", "updated");

        assertEquals(List.of(churn.getPublicId(), cardio.getPublicId()), publicIds(page));
        assertEquals(2, page.totalItems());
        assertFalse(page.hasNext());
        assertEquals(new PublicBookmarkSummaryDto(cardio.getPublicId(), "production",
                "Estimates cardiovascular risk.", 2, 2, "Acme Health", null, page.items().get(1).updatedAt()),
                page.items().get(1));
        assertEquals("Globex Retail", page.items().get(0).organizationName());
        // The description is the bookmark's own: one without it shows none, whatever its schema says.
        assertNull(page.items().get(0).description());
    }

    @Test
    void aPublishedFormServesThePluginsItsSchemaUsesAndNoOthers() {
        cardio.getVersion().setFormSchema(Map.of(
                "fields", List.of(
                        Map.of("kind", "number", "label", "Age", "mappedTo", "age"),
                        Map.of("kind", "body-map", "label", "Pain", "mappedTo", "pain"),
                        Map.of("kind", "series", "label", "Visits",
                                "columns", List.of(Map.of("kind", "dose-picker", "id", "dose")))),
                "reports", List.of(Map.of("kind", "risk-gauge", "label", "Risk", "mappedTo", "prediction"))));
        entityManager.flush();
        OffsetDateTime at = DAY;
        List<PluginRuntimeSourceDto> served = List.of(new PluginRuntimeSourceDto(
                "body-map", "body-map.ts", "text/typescript", 12, at, at, "export default {}"));
        Long acme = cardio.getSchema().getOrganization().getId();
        // Every kind the schema names is asked for; the plugin catalog knows which are plugins.
        when(plugins.listUsed(acme, Set.of("number", "body-map", "series", "dose-picker", "risk-gauge")))
                .thenReturn(served);

        assertEquals(served, service.listPublishedPlugins(cardio.getPublicId()));
    }

    @Test
    void aFormThatIsNotPublicServesNoPlugin() {
        assertThrows(ResponseStatusException.class, () -> service.listPublishedPlugins(draft.getPublicId()));
        assertThrows(ResponseStatusException.class, () -> service.listPublishedPlugins(archived.getPublicId()));
        verifyNoInteractions(plugins);
    }

    @Test
    void aCardCountsWhatThePublicPageShows() {
        PublicBookmarkSummaryDto card = search("production").items().get(0);
        PublicBookmarkDto page = service.getPublishedBookmark(cardio.getPublicId());

        // Three stored fields, one of them hidden; one stored report that each of the two models produces.
        assertEquals(2, card.inputCount());
        assertEquals(2, card.reportCount());
        assertEquals(card.inputCount(), page.inputCount());
        assertEquals(card.reportCount(), page.reportCount());
        assertEquals(2, ((List<?>) page.formSchema().get("fields")).size());
        assertEquals(2, ((List<?>) page.formSchema().get("reports")).size());
        // A bookmark with an empty form and no model has nothing to count.
        assertEquals(0, search("beta").items().get(0).inputCount());
        assertEquals(0, search("beta").items().get(0).reportCount());
    }

    @Test
    void aCardCarriesNothingBeyondWhatItShows() throws Exception {
        ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());
        PublicBookmarkSummaryDto card = service.getPublishedBookmarkPage(0, 24, "cardio", "updated").items().get(0);

        assertEquals(Set.of("publicId", "name", "description", "inputCount", "reportCount",
                "organizationName", "organizationLogoUrl", "updatedAt"), mapper.convertValue(card, Map.class).keySet());
        String json = mapper.writeValueAsString(card);
        // Neither the member's address nor the organization's names for its schema and snapshot.
        for (String internal : List.of("qa@example.test", "Cardio risk", "Baseline", "Internal notes")) {
            assertFalse(json.contains(internal), internal);
        }
    }

    @Test
    void searchMatchesNameDescriptionAndPublisherButNeverPrivateOrArchivedOnes() {
        assertEquals(List.of(churn.getPublicId()), publicIds(search("beta")));
        assertEquals(List.of(cardio.getPublicId()), publicIds(search("PRODUCTION")));
        assertEquals(List.of(cardio.getPublicId()), publicIds(search("  cardiovascular ")));
        // A schema's name and description are not shown on a card, so they are not searched either.
        assertTrue(search("churn").items().isEmpty());
        assertTrue(search("cardio risk").items().isEmpty());
        assertTrue(search("cohort").items().isEmpty());
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
        Organization organization = new Organization(slug, name, null, owner);
        entityManager.persist(organization);
        return organization;
    }

    private Schema schema(Organization organization, String name, String description) {
        Schema schema = new Schema(organization, name, description);
        entityManager.persist(schema);
        return schema;
    }

    /** Every bookmark has a public id, as one that was published once and unpublished does. */
    private SchemaBookmark bookmark(Schema schema, String name, String description,
            BookmarkVisibility visibility, OffsetDateTime updatedAt) {
        SchemaVersion version = new SchemaVersion(schema, 3, "Baseline", Map.of());
        entityManager.persist(version);
        SchemaBookmark bookmark = new SchemaBookmark(schema, version, name);
        bookmark.setDescription(description);
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
