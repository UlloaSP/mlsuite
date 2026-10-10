package dev.ulloasp.mlsuite.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.admin.moderation.ModeratedBookmarkDto;
import dev.ulloasp.mlsuite.admin.moderation.PublicBookmarkModerationService;
import dev.ulloasp.mlsuite.audit.adapter.out.persistence.repository.AuditEventRepository;
import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditEvent;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.domain.model.BookmarkVisibility;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import jakarta.persistence.EntityManager;

/** Moderation against real rows: what the list reaches, and what unpublishing changes and records. */
@DataJpaTest(properties = {
        "spring.profiles.active=test", "logging.file.name=target/bookmark-moderation-test.log",
        "spring.datasource.url=jdbc:h2:mem:bookmarkmoderation;MODE=PostgreSQL;INIT=CREATE DOMAIN IF NOT EXISTS TIMESTAMPTZ AS TIMESTAMP WITH TIME ZONE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop", "spring.flyway.enabled=false"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({ PublicBookmarkModerationService.class, AuditLogService.class, UserLookupService.class })
@ContextConfiguration(classes = PublicBookmarkModerationServiceTest.PersistenceConfig.class)
class PublicBookmarkModerationServiceTest {

    @Configuration
    @EntityScan("dev.ulloasp.mlsuite")
    @EnableJpaRepositories("dev.ulloasp.mlsuite")
    static class PersistenceConfig {
        @Bean
        WorkspaceAccessService workspaceAccess() {
            return mock(WorkspaceAccessService.class);
        }

        @Bean
        WorkspaceAuthorizationService workspaceAuthorization() {
            return mock(WorkspaceAuthorizationService.class);
        }
    }

    @Autowired
    private EntityManager entityManager;
    @Autowired
    private PublicBookmarkModerationService service;
    @Autowired
    private SchemaBookmarkRepository bookmarks;
    @Autowired
    private AuditEventRepository auditEvents;

    private User moderator;
    private Organization acme;
    private SchemaBookmark acmePublic;
    private SchemaBookmark acmePrivate;
    private SchemaBookmark globexPublic;
    private SchemaBookmark globexArchived;

    @BeforeEach
    void setUp() {
        moderator = user("root", SystemRole.SUPERADMIN);
        acme = organization("Acme Health");
        Organization globex = organization("Globex");
        acmePublic = bookmark(acme, "Cardio risk", "production", "acme-public", false);
        acmePrivate = bookmark(acme, "Triage", "staging", null, false);
        globexPublic = bookmark(globex, "Churn", "live", "globex-public", false);
        globexArchived = bookmark(globex, "Retired", "legacy", "globex-archived", true);
        // Rows stay managed: H2 cannot read a snapshot's JSON form back, so nothing here reloads one.
        entityManager.flush();
    }

    @Test
    void listsOnlyPublicBookmarksOfEveryOrganizationAndFlagsArchivedSchemas() {
        PageDto<ModeratedBookmarkDto> page = service.list(0, 8, "", "name");

        assertEquals(3, page.totalItems());
        assertFalse(page.hasNext());
        assertEquals(List.of("legacy", "live", "production"), page.items().stream().map(ModeratedBookmarkDto::name).toList());
        ModeratedBookmarkDto archived = page.items().get(0);
        assertEquals(globexArchived.getId(), archived.id());
        assertEquals("Retired", archived.schemaName());
        assertEquals("Globex", archived.organizationName());
        assertEquals("globex-archived", archived.publicId());
        assertEquals(1, archived.version());
        assertEquals("v1", archived.versionName());
        assertTrue(archived.schemaArchived());
        assertFalse(page.items().get(1).schemaArchived());
        assertEquals("Acme Health", page.items().get(2).organizationName());
    }

    @Test
    void searchesBookmarkSchemaAndOrganizationNamesAndPaginates() {
        assertEquals(List.of("production"), names(service.list(0, 8, "  acme ", "updated")));
        assertEquals(List.of("live"), names(service.list(0, 8, "CHURN", "updated")));
        assertEquals(List.of("legacy"), names(service.list(0, 8, "lega", "updated")));
        assertEquals(List.of(), names(service.list(0, 8, "staging", "updated")));

        PageDto<ModeratedBookmarkDto> first = service.list(0, 2, "", "organization");
        assertEquals(List.of("production", "legacy"), names(first));
        assertEquals(3, first.totalItems());
        assertTrue(first.hasNext());
        assertEquals(List.of("live"), names(service.list(1, 2, "", "organization")));
    }

    @Test
    void unpublishingMakesTheBookmarkPrivateKeepsItsPublicIdAndRecordsTheModeration() {
        SchemaBookmark result = service.unpublish(moderator.getId(), acmePublic.getId());
        entityManager.flush();

        assertEquals(BookmarkVisibility.PRIVATE, result.getVisibility());
        assertEquals("acme-public", result.getPublicId());
        assertEquals(List.of("PRIVATE", "acme-public"), List.of(storedColumns(acmePublic)));
        assertTrue(bookmarks.findPublishedByPublicId("acme-public").isEmpty());
        assertEquals(List.of("legacy", "live"), names(service.list(0, 8, "", "name")));

        List<AuditEvent> events = auditEvents.findTop20ByOrganizationIdOrderByCreatedAtDesc(acme.getId());
        assertEquals(1, events.size());
        AuditEvent event = events.get(0);
        assertEquals("BOOKMARK_MODERATION_UNPUBLISH", event.getAction());
        assertEquals("SCHEMA_BOOKMARK", event.getTargetType());
        assertEquals(acmePublic.getId().toString(), event.getTargetId());
        assertEquals("production", event.getMetadata());
        assertEquals(moderator.getId(), event.getActor().getId());
    }

    @Test
    void unpublishingAPrivateBookmarkChangesAndRecordsNothing() {
        SchemaBookmark result = service.unpublish(moderator.getId(), acmePrivate.getId());
        entityManager.flush();

        assertEquals(BookmarkVisibility.PRIVATE, result.getVisibility());
        assertTrue(auditEvents.findTop20ByOrganizationIdOrderByCreatedAtDesc(acme.getId()).isEmpty());
        assertEquals(3, service.list(0, 8, "", "name").totalItems());
    }

    @Test
    void anUnknownBookmarkIsNotFound() {
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.unpublish(moderator.getId(), 999_999L));

        assertEquals(404, error.getStatusCode().value());
        assertEquals("PUBLIC", storedColumns(globexPublic)[0]);
    }

    /** The persisted visibility and public id, read past the persistence context. */
    private Object[] storedColumns(SchemaBookmark bookmark) {
        return (Object[]) entityManager
                .createNativeQuery("SELECT visibility, public_id FROM schema_bookmark WHERE id = :id")
                .setParameter("id", bookmark.getId())
                .getSingleResult();
    }

    private static List<String> names(PageDto<ModeratedBookmarkDto> page) {
        return page.items().stream().map(ModeratedBookmarkDto::name).toList();
    }

    private User user(String name, SystemRole role) {
        User user = new User(name, name + "@example.test", "unused", name, role);
        entityManager.persist(user);
        return user;
    }

    private Organization organization(String name) {
        String slug = name.toLowerCase().replace(' ', '-');
        Organization organization = new Organization(slug, name, null, user(slug + "-owner", SystemRole.USER));
        entityManager.persist(organization);
        return organization;
    }

    private SchemaBookmark bookmark(Organization organization, String schemaName, String name, String publicId,
            boolean archived) {
        Schema schema = new Schema(organization, schemaName, null);
        if (archived) schema.setArchivedAt(OffsetDateTime.now());
        entityManager.persist(schema);
        SchemaVersion version = new SchemaVersion(schema, 1, "v1", Map.of());
        entityManager.persist(version);
        SchemaBookmark bookmark = new SchemaBookmark(schema, version, name);
        if (publicId != null) {
            bookmark.setPublicId(publicId);
            bookmark.setVisibility(BookmarkVisibility.PUBLIC);
        }
        entityManager.persist(bookmark);
        return bookmark;
    }
}
