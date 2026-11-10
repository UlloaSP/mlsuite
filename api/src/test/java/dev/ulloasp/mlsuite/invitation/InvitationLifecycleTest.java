package dev.ulloasp.mlsuite.invitation;

import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import static dev.ulloasp.mlsuite.support.TestFixtures.organization;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.mockito.ArgumentCaptor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.invitation.adapter.out.persistence.repository.InvitationRepository;
import dev.ulloasp.mlsuite.invitation.application.dto.CreateInvitationRequest;
import dev.ulloasp.mlsuite.invitation.application.usecase.InvitationManagementService;
import dev.ulloasp.mlsuite.invitation.domain.model.Invitation;
import dev.ulloasp.mlsuite.invitation.domain.model.InvitationStatus;
import dev.ulloasp.mlsuite.notification.application.service.NotificationService;
import dev.ulloasp.mlsuite.notification.domain.model.NotificationKind;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.support.TestFixtures;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

/** An invitation after it is sent: resent while it is pending, revoked only while it is pending. */
@ExtendWith(MockitoExtension.class)
class InvitationLifecycleTest {

    @Mock
    private WorkspaceAccessService workspaceAccessService;

    @Mock
    private InvitationRepository invitationRepository;

    @Mock
    private OrganizationMembershipRepository organizationMembershipRepository;

    @Mock
    private OrganizationRepository organizationRepository;

    @Mock
    private UserLookupService userLookupService;

    @Mock
    private WorkspaceAuthorizationService workspaceAuthorizationService;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private RoleDefinitionRepository roleDefinitionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationService notificationService;

    private InvitationManagementService service;

    @BeforeEach
    void setUp() {
        service = new InvitationManagementService(
                workspaceAccessService,
                invitationRepository,
                organizationMembershipRepository,
                organizationRepository,
                userLookupService,
                workspaceAuthorizationService,
                auditLogService,
                roleDefinitionRepository,
                userRepository,
                notificationService, TestFixtures.principals());
    }

    @Test
    void resendInvitation_TellsTheInvitedAccountAgain() {
        Organization org = organization();
        Invitation expired = new Invitation(org, "target@example.com", reviewerRole(org), TestFixtures.principal(user(7L)),
                OffsetDateTime.now(ZoneOffset.UTC).minusDays(1));
        expired.setId(12L);
        when(workspaceAccessService.requireUser(7L)).thenReturn(user(7L));
        when(invitationRepository.findById(12L)).thenReturn(Optional.of(expired));
        when(invitationRepository.save(expired)).thenReturn(expired);
        when(userRepository.findByEmailIgnoreCase("target@example.com")).thenReturn(Optional.of(user(8L)));

        service.resendInvitation(7L, 41L, 12L);

        verify(notificationService).notify(eq(8L), eq(41L), eq(NotificationKind.INVITATION_RECEIVED), eq("12"), any());
    }

    @Test
    void resendInvitation_RefusesAClosedInvitation() {
        Organization org = organization();
        for (InvitationStatus closed : List.of(InvitationStatus.REVOKED, InvitationStatus.DECLINED, InvitationStatus.ACCEPTED)) {
            Invitation invitation = new Invitation(org, "target@example.com", reviewerRole(org),
                    TestFixtures.principal(user(7L)), OffsetDateTime.now(ZoneOffset.UTC).plusDays(1));
            invitation.setId(12L);
            invitation.setStatus(closed);
            when(workspaceAccessService.requireUser(7L)).thenReturn(user(7L));
            when(invitationRepository.findById(12L)).thenReturn(Optional.of(invitation));

            ResponseStatusException refused = assertThrows(ResponseStatusException.class,
                    () -> service.resendInvitation(7L, 41L, 12L));

            assertEquals(HttpStatus.CONFLICT, refused.getStatusCode(), closed.name());
        }
        verify(invitationRepository, never()).save(any());
    }

    @Test
    void revokeInvitation_ClosesItAndTakesBackWhatToldTheInvitee() {
        Organization org = organization();
        Invitation pending = new Invitation(org, "target@example.com", reviewerRole(org), TestFixtures.principal(user(7L)),
                OffsetDateTime.now(ZoneOffset.UTC).plusDays(1));
        pending.setId(12L);
        when(invitationRepository.findById(12L)).thenReturn(Optional.of(pending));

        service.revokeInvitation(7L, 41L, 12L);

        assertEquals(InvitationStatus.REVOKED, pending.getStatus());
        verify(workspaceAuthorizationService).require(7L, 41L, PermissionKey.MANAGE_INVITATIONS);
        verify(notificationService).withdraw(NotificationKind.INVITATION_RECEIVED, "12");
    }

    @Test
    void revokeInvitation_RevokesAnExpiredInvitation() {
        Organization org = organization();
        Invitation expired = new Invitation(org, "target@example.com", reviewerRole(org), TestFixtures.principal(user(7L)),
                OffsetDateTime.now(ZoneOffset.UTC).minusDays(1));
        expired.setId(12L);
        when(invitationRepository.findById(12L)).thenReturn(Optional.of(expired));

        service.revokeInvitation(7L, 41L, 12L);

        assertEquals(InvitationStatus.REVOKED, expired.getStatus());
    }

    @Test
    void revokeInvitation_RefusesAClosedInvitation() {
        Organization org = organization();
        for (InvitationStatus closed : List.of(InvitationStatus.REVOKED, InvitationStatus.DECLINED, InvitationStatus.ACCEPTED)) {
            Invitation invitation = new Invitation(org, "target@example.com", reviewerRole(org),
                    TestFixtures.principal(user(7L)), OffsetDateTime.now(ZoneOffset.UTC).plusDays(1));
            invitation.setId(12L);
            invitation.setStatus(closed);
            when(invitationRepository.findById(12L)).thenReturn(Optional.of(invitation));

            ResponseStatusException refused = assertThrows(ResponseStatusException.class,
                    () -> service.revokeInvitation(7L, 41L, 12L));

            assertEquals(HttpStatus.CONFLICT, refused.getStatusCode(), closed.name());
            assertEquals(closed, invitation.getStatus());
        }
        verify(invitationRepository, never()).save(any());
        verifyNoInteractions(notificationService);
    }

    @Test
    void revokeInvitation_RefusesAnInvitationOfAnotherOrganization() {
        Organization other = organization();
        other.setId(99L);
        Invitation foreign = new Invitation(other, "target@example.com", reviewerRole(other),
                TestFixtures.principal(user(7L)), OffsetDateTime.now(ZoneOffset.UTC).plusDays(1));
        when(invitationRepository.findById(12L)).thenReturn(Optional.of(foreign));

        assertThrows(IllegalArgumentException.class, () -> service.revokeInvitation(7L, 41L, 12L));

        verify(invitationRepository, never()).save(any());
    }

    private RoleDefinition reviewerRole(Organization org) {
        RoleDefinition role = TestFixtures.role(org, "REVIEWER", PermissionKey.REVIEW);
        role.setId(5L);
        return role;
    }

    private User user(Long id) {
        User user = new User();
        user.setId(id);
        user.setEmail("admin@example.com");
        user.setFullName("Admin");
        return user;
    }
}
