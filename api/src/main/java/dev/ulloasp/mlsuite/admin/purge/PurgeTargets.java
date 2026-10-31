package dev.ulloasp.mlsuite.admin.purge;

import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.user.application.service.AccountDeletionRules;
import dev.ulloasp.mlsuite.user.domain.model.User;
import jakarta.annotation.Nullable;
import lombok.RequiredArgsConstructor;

/** Finds what a purge names, says what it is called and whether it may go, and closes it. */
@Component
@RequiredArgsConstructor
class PurgeTargets {

    private final OrganizationRepository organizations;
    private final SchemaRepository schemas;
    private final ModelRepository models;
    private final UserRepository users;
    private final AccountDeletionRules accountRules;
    private final PurgeLedger ledger;
    private final JdbcTemplate jdbc;

    /** {@code organizationId} is the one the job deletes or works in; {@code confirmation} what to type back. */
    record Target(PurgeScope scope, Long id, String label, String confirmation, Long organizationId,
            @Nullable String refusal) {
    }

    Target find(Long actorId, PurgeScope scope, Long id) {
        Target target = switch (scope) {
            case ORGANIZATION -> organization(id);
            case USER -> user(actorId, id);
            case SCHEMA -> schema(id);
            case MODEL -> model(id);
        };
        return ledger.isOpen(scope, id) ? refused(target, "A purge of this already exists; see Purges.")
                : ledger.isOpenIn(target.organizationId()) ? refused(target, "A purge is running in this organization.")
                : target;
    }

    /**
     * Takes the target's row lock and closes it: whatever would write into it now finds it purging,
     * and whatever got in first has committed. Callers lock before they {@link #find} it, in the
     * transaction that inserts the job.
     */
    void lock(PurgeScope scope, Long id) {
        String table = switch (scope) {
            case ORGANIZATION -> "organization";
            case USER -> "app_user";
            case SCHEMA -> "schema_artifact";
            case MODEL -> "model";
        };
        jdbc.queryForList("SELECT id FROM " + table + " WHERE id = ? FOR UPDATE", Long.class, id);
    }

    void close(Target target) {
        switch (target.scope()) {
            case ORGANIZATION -> mark("organization", target.id());
            case SCHEMA -> mark("schema_artifact", target.id());
            case MODEL -> mark("model", target.id());
            case USER -> {
                mark("organization", target.organizationId());
                jdbc.update("UPDATE app_user SET enabled = FALSE, updated_at = now() WHERE id = ?", target.id());
            }
        }
    }

    private void mark(String table, Long id) {
        jdbc.update("UPDATE " + table + " SET purging_at = now() WHERE id = ? AND purging_at IS NULL", id);
    }

    private Target organization(Long id) {
        Organization organization = organizations.findById(id).orElseThrow(() -> missing("Organization"));
        String refusal = organization.isPersonal() ? "A personal account is purged through its user." : null;
        return new Target(PurgeScope.ORGANIZATION, id, organization.getName(), organization.getName(), id, refusal);
    }

    private Target user(Long actorId, Long id) {
        User user = users.findById(id).orElseThrow(() -> missing("User"));
        Organization personal = organizations.findByOwnerUserId(id).orElseThrow();
        String refusal = id.equals(actorId) ? "Delete your own account from Settings."
                : accountRules.refusal(user).orElse(null);
        return new Target(PurgeScope.USER, id, user.getFullName(), user.getUsername(), personal.getId(), refusal);
    }

    private Target schema(Long id) {
        Schema schema = schemas.findById(id).orElseThrow(() -> missing("Schema"));
        return inOrganization(PurgeScope.SCHEMA, id, schema.getName(), schema.getOrganization());
    }

    private Target model(Long id) {
        Model model = models.findById(id).orElseThrow(() -> missing("Model"));
        return inOrganization(PurgeScope.MODEL, id, model.getName(), model.getOrganization());
    }

    private static Target inOrganization(PurgeScope scope, Long id, String name, Organization organization) {
        return new Target(scope, id, name, name, organization.getId(), Optional.ofNullable(organization.getPurgingAt())
                .map(at -> "Its organization is being deleted.").orElse(null));
    }

    private static Target refused(Target target, String reason) {
        return new Target(target.scope(), target.id(), target.label(), target.confirmation(), target.organizationId(),
                target.refusal() == null ? reason : target.refusal());
    }

    private static ResponseStatusException missing(String what) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, what + " not found");
    }
}
