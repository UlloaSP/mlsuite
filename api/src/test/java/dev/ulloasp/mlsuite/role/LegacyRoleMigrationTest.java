package dev.ulloasp.mlsuite.role;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import dev.ulloasp.mlsuite.invitation.adapter.out.persistence.repository.InvitationRepository;
import dev.ulloasp.mlsuite.invitation.domain.model.Invitation;
import dev.ulloasp.mlsuite.invitation.domain.model.InvitationStatus;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleTemplateRepository;
import dev.ulloasp.mlsuite.role.application.service.LegacyRolePermissionMapper;
import dev.ulloasp.mlsuite.role.application.service.RoleSeedService;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.role.domain.model.RoleScope;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceBootstrapService;

@ExtendWith(MockitoExtension.class)
class LegacyRoleMigrationTest {

    @Mock private OrganizationRepository organizations;
    @Mock private OrganizationMembershipRepository memberships;
    @Mock private InvitationRepository invitations;
    @Mock private RoleDefinitionRepository roles;
    @Mock private RoleTemplateRepository templates;

    private final LegacyRolePermissionMapper mapper = new LegacyRolePermissionMapper();
    private RoleSeedService migration;
    private Organization organization;
    private Map<OrganizationRole, RoleDefinition> systemRoles;

    @BeforeEach
    void setUp() {
        migration = new RoleSeedService(organizations, memberships, invitations, roles, templates, mapper);
        organization = organization(41L);
        systemRoles = new EnumMap<>(OrganizationRole.class);
        for (OrganizationRole role : OrganizationRole.values()) {
            RoleDefinition definition = new RoleDefinition(
                    organization, RoleScope.ORGANIZATION, role.name(), role.name().toLowerCase(), role.name());
            definition.setPermissions(mapper.organization(role));
            systemRoles.put(role, definition);
        }
    }

    @Test
    void runBackfillsEveryStatusAndPreservesExistingDefinitionsOnRepeatedRuns() throws Exception {
        when(templates.findBySlug(anyString())).thenReturn(Optional.of(mock()));
        when(organizations.findAll()).thenReturn(List.of(organization));
        when(roles.findByOrganizationIdAndSystemKey(anyLong(), anyString()))
                .thenAnswer(invocation -> Optional.of(systemRoles.get(
                        OrganizationRole.valueOf(invocation.getArgument(1, String.class)))));
        List<OrganizationMembership> legacyMemberships = List.of(
                membership(OrganizationRole.OWNER, MembershipStatus.ACTIVE),
                membership(OrganizationRole.ADMIN, MembershipStatus.PENDING),
                membership(OrganizationRole.MEMBER, MembershipStatus.REMOVED));
        List<Invitation> legacyInvitations = List.of(
                invitation(OrganizationRole.OWNER, InvitationStatus.PENDING),
                invitation(OrganizationRole.ADMIN, InvitationStatus.ACCEPTED),
                invitation(OrganizationRole.MEMBER, InvitationStatus.EXPIRED),
                invitation(OrganizationRole.VIEWER, InvitationStatus.REVOKED));
        RoleDefinition custom = new RoleDefinition(
                organization, RoleScope.ORGANIZATION, "Auditor", "auditor", null);
        OrganizationMembership customMembership = membership(OrganizationRole.VIEWER, MembershipStatus.REMOVED);
        Invitation customInvitation = invitation(OrganizationRole.MEMBER, InvitationStatus.REVOKED);
        customMembership.setRoleDefinition(custom);
        customInvitation.setRoleDefinition(custom);

        when(memberships.findByOrganizationId(41L))
                .thenReturn(join(legacyMemberships, customMembership));
        when(invitations.findByOrganizationIdOrderByCreatedAtDesc(41L))
                .thenReturn(join(legacyInvitations, customInvitation));

        migration.run(null);
        migration.run(null);

        legacyMemberships.forEach(membership -> assertSame(
                systemRoles.get(membership.getRole()), membership.getRoleDefinition()));
        legacyInvitations.forEach(invitation -> assertSame(
                systemRoles.get(invitation.getRole()), invitation.getRoleDefinition()));
        assertSame(custom, customMembership.getRoleDefinition());
        assertSame(custom, customInvitation.getRoleDefinition());
        verify(memberships, times(1)).saveAll(legacyMemberships);
        verify(invitations, times(1)).saveAll(legacyInvitations);
    }

    @Test
    void bootstrapPersistsOwnerWithItsRoleDefinition() {
        OrganizationRepository bootstrapOrganizations = mock();
        OrganizationMembershipRepository bootstrapMemberships = mock();
        UserRepository users = mock();
        ModelRepository models = mock();
        RoleSeedService seeds = mock();
        WorkspaceBootstrapService bootstrap = new WorkspaceBootstrapService(
                bootstrapOrganizations, bootstrapMemberships, users, models, seeds);
        User user = user();
        RoleDefinition ownerRole = systemRoles.get(OrganizationRole.OWNER);
        when(bootstrapMemberships.findActiveByUserId(7L)).thenReturn(List.of());
        when(bootstrapOrganizations.existsBySlug(anyString())).thenReturn(false);
        when(bootstrapOrganizations.save(any(Organization.class))).thenAnswer(invocation -> {
            Organization saved = invocation.getArgument(0);
            saved.setId(41L);
            return saved;
        });
        when(seeds.orgRole(any(Organization.class), eq(OrganizationRole.OWNER))).thenReturn(ownerRole);
        when(models.findByUserIdAndOrganizationIdIsNull(7L)).thenReturn(List.of());

        bootstrap.ensureCurrentOrganization(user);

        ArgumentCaptor<OrganizationMembership> saved = ArgumentCaptor.forClass(OrganizationMembership.class);
        verify(bootstrapMemberships).save(saved.capture());
        assertEquals(OrganizationRole.OWNER, saved.getValue().getRole());
        assertSame(ownerRole, saved.getValue().getRoleDefinition());
    }

    private OrganizationMembership membership(OrganizationRole role, MembershipStatus status) {
        return new OrganizationMembership(organization, user(), role, status);
    }

    private Invitation invitation(OrganizationRole role, InvitationStatus status) {
        Invitation invitation = new Invitation(
                organization, "member@example.com", role, null, "token-" + role + status, user(),
                OffsetDateTime.now().plusDays(1));
        invitation.setStatus(status);
        return invitation;
    }

    private Organization organization(Long id) {
        Organization value = new Organization("org", "Organization", null, null, user());
        value.setId(id);
        return value;
    }

    private User user() {
        User user = new User("user", "user@example.com", "hash", "User", SystemRole.USER);
        user.setId(7L);
        return user;
    }

    private <T> List<T> join(List<T> values, T extra) {
        return java.util.stream.Stream.concat(values.stream(), java.util.stream.Stream.of(extra)).toList();
    }
}
