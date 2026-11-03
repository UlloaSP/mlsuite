package dev.ulloasp.mlsuite.admin.purge;

import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.notification.application.service.NotificationService;
import dev.ulloasp.mlsuite.notification.domain.model.NotificationKind;
import lombok.RequiredArgsConstructor;

/**
 * What is left of an organization once its work is gone. Its active members hear of it in the
 * transaction that ends their membership, so a crash neither loses nor repeats the news; the
 * audit log, the notifications and the storage queue stay, and name it by id alone.
 */
@Component
@RequiredArgsConstructor
class PurgeMemberSteps {

    private final JdbcTemplate jdbc;
    private final NotificationService notifications;

    private record Member(Long userId, boolean active) {
    }

    List<PurgeStep> of(PurgeJob job) {
        if (!job.scope().ownsOrganization()) return List.of();
        Long organization = job.organizationId();
        return List.of(
                new PurgeStep("apiCalls", limit -> jdbc.update("""
                        DELETE FROM api_request WHERE id IN (
                            SELECT id FROM api_request WHERE organization_id = ? LIMIT ?)""", organization, limit)),
                new PurgeStep("apiClients", limit -> jdbc.update("""
                        DELETE FROM api_client WHERE id IN (
                            SELECT id FROM api_client WHERE organization_id = ? LIMIT ?)""", organization, limit)),
                new PurgeStep("invitations", limit -> jdbc.update("""
                        DELETE FROM invitation WHERE id IN (
                            SELECT id FROM invitation WHERE organization_id = ? LIMIT ?)""", organization, limit)),
                new PurgeStep("memberships", limit -> memberships(job)),
                new PurgeStep("selections", limit -> jdbc.update("""
                        UPDATE app_user SET current_organization_id = NULL WHERE id IN (
                            SELECT id FROM app_user WHERE current_organization_id = ? LIMIT ?)""", organization, limit)),
                new PurgeStep("rolePermissions", limit -> jdbc.update("""
                        DELETE FROM role_permission WHERE role_definition_id IN (
                            SELECT id FROM role_definition WHERE organization_id = ?)""", organization)),
                new PurgeStep("roles", limit -> jdbc.update("""
                        DELETE FROM role_definition WHERE id IN (
                            SELECT id FROM role_definition WHERE organization_id = ? LIMIT ?)""", organization, limit)));
    }

    private int memberships(PurgeJob job) {
        List<Member> gone = jdbc.query("DELETE FROM organization_membership WHERE organization_id = ?"
                + " RETURNING user_id, status = 'ACTIVE'", (rs, n) -> new Member(rs.getLong(1), rs.getBoolean(2)),
                job.organizationId());
        if (job.scope() == PurgeScope.ORGANIZATION) {
            gone.stream().filter(Member::active).filter(member -> !member.userId().equals(job.requestedBy()))
                    .forEach(member -> notifications.notify(member.userId(), null, NotificationKind.ORGANIZATION_PURGED,
                            job.organizationId().toString(), Map.of("organizationName", job.targetLabel())));
        }
        return gone.size();
    }
}
