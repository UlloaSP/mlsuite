package dev.ulloasp.mlsuite.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.IllegalTransactionStateException;

import dev.ulloasp.mlsuite.notification.application.service.NotificationRetention;
import dev.ulloasp.mlsuite.notification.application.service.NotificationService;
import dev.ulloasp.mlsuite.notification.domain.model.NotificationKind;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;

/**
 * A member's inbox: written only inside the transition it reports, read and changed only by its
 * recipient, a notification outlives what it describes, and those read long ago are forgotten.
 */
@TestPropertySource(properties = { "mlsuite.notifications.retention-days=30",
        "mlsuite.notifications.retention-batch-size=2" })
class NotificationHttpTest extends PublicPredictionFixture {

    @Autowired NotificationService notifications;
    @Autowired NotificationRetention retention;
    @Autowired JdbcTemplate jdbc;
    private User member;

    @BeforeEach
    void aMemberWithAnEmptyInbox() {
        inTransaction(() -> {
            member = new User("member" + System.nanoTime(), "member-" + UUID.randomUUID() + "@corp.example", "unused",
                    "Member", SystemRole.USER);
            entityManager.persist(member);
        });
    }

    @Test
    void theCatalogListsTheMembersOwnNewestFirstWithTheLabelsThatDrawThem() throws Exception {
        long first = notify(member);
        long second = notify(member);
        notify(owner);

        mockMvc.perform(signedIn(get("/api/notifications/catalog").param("size", "1"), member.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(2))
                .andExpect(jsonPath("$.hasNext").value(true))
                .andExpect(jsonPath("$.items[0].id").value(second))
                .andExpect(jsonPath("$.items[0].kind").value("MODEL_READY"))
                .andExpect(jsonPath("$.items[0].targetType").value("MODEL"))
                .andExpect(jsonPath("$.items[0].targetId").value(forestModel.getId().toString()))
                .andExpect(jsonPath("$.items[0].organizationId").value(organization.getId()))
                .andExpect(jsonPath("$.items[0].payload.modelName").value("risk-forest"))
                .andExpect(jsonPath("$.items[0].readAt").doesNotExist());
        mockMvc.perform(signedIn(get("/api/notifications/catalog").param("page", "1").param("size", "1"), member.getId()))
                .andExpect(jsonPath("$.items[0].id").value(first));
    }

    @Test
    void readingOneTakesItOutOfTheUnreadFilterAndCount() throws Exception {
        long read = notify(member);
        long unread = notify(member);
        unread(2);

        mockMvc.perform(signedIn(post("/api/notifications/{id}/read", read), member.getId()))
                .andExpect(status().isNoContent());
        mockMvc.perform(signedIn(post("/api/notifications/{id}/read", read), member.getId()))
                .andExpect(status().isNoContent());

        unread(1);
        mockMvc.perform(signedIn(get("/api/notifications/catalog").param("filter", "unread"), member.getId()))
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].id").value(unread));
        mockMvc.perform(signedIn(get("/api/notifications/catalog"), member.getId()))
                .andExpect(jsonPath("$.totalItems").value(2))
                .andExpect(jsonPath("$.items[1].readAt").exists());
    }

    @Test
    void readingAllLeavesAnotherMembersUnread() throws Exception {
        notify(member);
        notify(member);
        notify(owner);

        mockMvc.perform(signedIn(post("/api/notifications/read-all"), member.getId()))
                .andExpect(status().isNoContent());

        unread(0);
        assertEquals(1, unreadOf(owner));
    }

    @Test
    void deletingAllReadLeavesTheUnreadOnes() throws Exception {
        long read = notify(member);
        long unread = notify(member);
        long gone = notify(member);
        mockMvc.perform(signedIn(post("/api/notifications/{id}/read", read), member.getId()));

        mockMvc.perform(signedIn(delete("/api/notifications/{id}", gone), member.getId()))
                .andExpect(status().isNoContent());
        mockMvc.perform(signedIn(delete("/api/notifications/read"), member.getId()))
                .andExpect(status().isNoContent());

        assertEquals(java.util.List.of(unread), jdbc.queryForList(
                "SELECT id FROM notification WHERE recipient_user_id = ?", Long.class, member.getId()));
    }

    @Test
    void anotherMembersNotificationDoesNotExistForThem() throws Exception {
        long theirs = notify(owner);

        mockMvc.perform(signedIn(post("/api/notifications/{id}/read", theirs), member.getId()))
                .andExpect(status().isNotFound());
        mockMvc.perform(signedIn(delete("/api/notifications/{id}", theirs), member.getId()))
                .andExpect(status().isNotFound());
        mockMvc.perform(signedIn(delete("/api/notifications/{id}", Long.MAX_VALUE), member.getId()))
                .andExpect(status().isNotFound());

        assertEquals(1, unreadOf(owner));
    }

    @Test
    void theInboxRequiresASession() throws Exception {
        mockMvc.perform(get("/api/notifications/catalog")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/notifications/unread-count")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/notifications/read-all")).andExpect(status().isUnauthorized());
    }

    @Test
    void aNotificationIsWrittenOnlyInsideTheTransitionItReports() {
        Map<String, Object> labels = Map.of("modelName", "risk-forest");

        assertThrows(IllegalTransactionStateException.class, () -> notifications.notify(member.getId(),
                organization.getId(), NotificationKind.MODEL_READY, "1", labels));
        assertThrows(IllegalStateException.class, () -> inTransaction(() -> {
            notifications.notify(member.getId(), organization.getId(), NotificationKind.MODEL_READY, "1", labels);
            throw new IllegalStateException("the transition failed");
        }));

        assertEquals(0, unreadOf(member));
    }

    @Test
    void aNotificationOutlivesWhatItDescribesButNotItsRecipient() throws Exception {
        long survivor = notify(member);
        inTransaction(() -> notifications.notify(member.getId(), null, NotificationKind.MODEL_READY, "gone",
                Map.of("modelName", "a removed model")));

        jdbc.update("UPDATE notification SET organization_id = ?, target_id = 'gone' WHERE id = ?", Long.MAX_VALUE, survivor);
        mockMvc.perform(signedIn(get("/api/notifications/catalog"), member.getId()))
                .andExpect(jsonPath("$.items[0].organizationId").doesNotExist())
                .andExpect(jsonPath("$.items[1].organizationId").value(Long.MAX_VALUE));

        jdbc.update("DELETE FROM app_user WHERE id = ?", member.getId());
        assertEquals(0, unreadOf(member));
    }

    @Test
    void retentionForgetsNotificationsReadLongAgoInBatchesAndKeepsUnreadOnes() {
        long[] old = { notify(member), notify(member), notify(member), notify(member), notify(member) };
        long recent = notify(member);
        long forgotten = notify(member);
        for (long id : old) {
            jdbc.update("UPDATE notification SET read_at = now() - interval '31 days' WHERE id = ?", id);
        }
        jdbc.update("UPDATE notification SET read_at = now() - interval '29 days' WHERE id = ?", recent);
        jdbc.update("UPDATE notification SET created_at = now() - interval '400 days' WHERE id = ?", forgotten);

        retention.prune();

        assertEquals(java.util.List.of(recent, forgotten), jdbc.queryForList(
                "SELECT id FROM notification WHERE recipient_user_id = ? ORDER BY id", Long.class, member.getId()));
    }

    private long notify(User recipient) {
        inTransaction(() -> notifications.notify(recipient.getId(), organization.getId(), NotificationKind.MODEL_READY,
                forestModel.getId().toString(), Map.of("modelName", "risk-forest")));
        return jdbc.queryForObject("SELECT max(id) FROM notification WHERE recipient_user_id = ?", Long.class,
                recipient.getId());
    }

    private void unread(int count) throws Exception {
        mockMvc.perform(signedIn(get("/api/notifications/unread-count"), member.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(count));
    }

    private int unreadOf(User recipient) {
        return jdbc.queryForObject("SELECT count(*) FROM notification WHERE recipient_user_id = ? AND read_at IS NULL",
                Integer.class, recipient.getId());
    }
}
