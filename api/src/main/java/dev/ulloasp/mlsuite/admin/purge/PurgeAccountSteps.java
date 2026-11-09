package dev.ulloasp.mlsuite.admin.purge;

import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;
import dev.ulloasp.mlsuite.organization.application.usecase.OrganizationDeletionService;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.plugin.application.service.PluginAuthorship;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.user.application.service.AccountDeletionRules;
import dev.ulloasp.mlsuite.user.domain.model.User;
import lombok.RequiredArgsConstructor;

/**
 * What a person leaves behind in the organizations that outlive them. Their personal account went
 * in the phases before; here what was theirs alone goes, and nothing of a team goes with them.
 * What they authored keeps its author: their principal outlives the user's row, deleted last,
 * and is then shown as "Deleted user".
 */
@Component
@RequiredArgsConstructor
class PurgeAccountSteps {

    private final JdbcTemplate jdbc;
    private final UserRepository users;
    private final AccountDeletionRules rules;
    private final OrganizationDeletionService organizations;
    private final AuditLogService auditLog;
    private final PluginAuthorship plugins;

    List<PurgeStep> of(PurgeJob job) {
        if (job.scope() != PurgeScope.USER) return List.of();
        Long userId = job.targetId();
        User user = users.findById(userId).orElseThrow();
        String email = user.getEmail();
        return List.of(
                new PurgeStep("anonymizedPlugins", limit -> plugins.forget(userId, limit)),
                new PurgeStep("emptyOrganizations", limit -> deleteEmptyTeams(userId)),
                new PurgeStep("invitations", limit -> jdbc.update("""
                        DELETE FROM invitation WHERE lower(email) = lower(?)
                            OR (created_by_principal_id = (SELECT id FROM principal WHERE user_id = ?) AND status = 'REVOKED')""", email, userId)),
                new PurgeStep("memberships", limit -> jdbc.update(
                        "DELETE FROM organization_membership WHERE user_id = ?", userId)));
    }

    /** Whatever changed since the purge was asked for is checked again: a team never goes unowned. */
    private int deleteEmptyTeams(Long userId) {
        User user = users.findById(userId).orElseThrow();
        rules.refusal(user).ifPresent(reason -> {
            throw new IllegalStateException(reason);
        });
        List<Organization> teams = rules.emptyTeams(user);
        teams.forEach(team -> {
            auditLog.record(AuditActor.SYSTEM, team.getId(), AuditAction.ORGANIZATION_DELETE, team.getId(),
                    AuditDetails.of("name", team.getName(), "reason", "Its only owner deleted their account"));
            organizations.delete(team.getId());
        });
        return teams.size();
    }

    /** The person's answers lose their name with this row, so each run they are on is projected again. */
    void deleteUser(Long userId) {
        jdbc.update("""
                INSERT INTO prediction_run_projection (prediction_run_id, answer_changes)
                SELECT DISTINCT x.prediction_run_id, 1 FROM prediction_result_feedback f
                JOIN prediction_result x ON x.id = f.prediction_result_id
                WHERE f.created_by_principal_id = (SELECT id FROM principal WHERE user_id = ?)
                ON CONFLICT (prediction_run_id) DO UPDATE SET answer_changes = prediction_run_projection.answer_changes + 1""", userId);
        jdbc.update("DELETE FROM app_user WHERE id = ?", userId);
    }
}
