package dev.ulloasp.mlsuite.security.identity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import dev.ulloasp.mlsuite.organization.entities.Organization;
import dev.ulloasp.mlsuite.organization.entities.OrganizationUser;
import dev.ulloasp.mlsuite.organization.entities.OrganizationUserStatus;
import dev.ulloasp.mlsuite.organization.services.OrganizationAccessService;
import dev.ulloasp.mlsuite.rbac.services.PermissionEvaluator;
import dev.ulloasp.mlsuite.security.local.LocalUserDetails;
import dev.ulloasp.mlsuite.security.tenant.OrganizationHeaderResolver;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.service.UserLookupService;

@ExtendWith(MockitoExtension.class)
class CurrentUserResolverTenantTest {

    @Mock
    private UserLookupService userLookupService;

    @Mock
    private OrganizationAccessService organizationAccessService;

    @Mock
    private OrganizationHeaderResolver organizationHeaderResolver;

    @Mock
    private PermissionEvaluator permissionEvaluator;

    @Mock
    private Authentication authentication;

    private CurrentUserResolver resolver;

    @BeforeEach
    void setUp() {
        resolver = new CurrentUserResolver(
                userLookupService,
                organizationAccessService,
                organizationHeaderResolver,
                permissionEvaluator);
    }

    @Test
    void resolve_BuildsOrganizationAwareCurrentUser() {
        User user = user(4L, "alice", true);
        OrganizationUser membership = membership(user, 9L, "acme", "Acme");
        when(authentication.getPrincipal()).thenReturn(
                new LocalUserDetails(4L, "alice", "alice@example.com", "hash", null));
        when(userLookupService.requireById(4L)).thenReturn(user);
        when(organizationHeaderResolver.requireOrganizationSlug()).thenReturn("acme");
        when(organizationAccessService.requireActiveMembership(user, "acme")).thenReturn(membership);
        when(permissionEvaluator.resolvePermissions(9L, 4L, true)).thenReturn(Set.of("models:read"));

        CurrentUser currentUser = resolver.resolve(authentication);

        assertEquals(4L, currentUser.userId());
        assertEquals(9L, currentUser.activeOrganizationId());
        assertEquals("acme", currentUser.activeOrganizationSlug());
        assertEquals("Acme", currentUser.activeOrganizationName());
        assertEquals(Set.of("models:read"), currentUser.permissions());
    }

    @Test
    void resolveProfile_UsesDefaultMembershipWhenHeaderMissing() {
        User user = user(7L, "bob", false);
        OrganizationUser membership = membership(user, 12L, "bob-7", "Bob Workspace");
        when(authentication.getPrincipal()).thenReturn(
                new LocalUserDetails(7L, "bob", "bob@example.com", "hash", null));
        when(userLookupService.requireById(7L)).thenReturn(user);
        when(organizationHeaderResolver.resolveOrganizationSlug()).thenReturn(null);
        when(organizationAccessService.resolveActiveMembershipOrDefault(user, null)).thenReturn(membership);
        when(permissionEvaluator.resolvePermissions(12L, 7L, false)).thenReturn(Set.of("plugins:read"));

        CurrentUser currentUser = resolver.resolveProfile(authentication);

        assertEquals("bob-7", currentUser.activeOrganizationSlug());
        assertEquals(Set.of("plugins:read"), currentUser.permissions());
    }

    private User user(Long id, String username, boolean superadmin) {
        User user = new User();
        user.setId(id);
        user.setUsername(username);
        user.setSuperadmin(superadmin);
        return user;
    }

    private OrganizationUser membership(User user, Long organizationId, String slug, String name) {
        Organization organization = new Organization();
        organization.setId(organizationId);
        organization.setSlug(slug);
        organization.setName(name);
        OrganizationUser membership = new OrganizationUser();
        membership.setOrganization(organization);
        membership.setUser(user);
        membership.setStatus(OrganizationUserStatus.ACTIVE);
        return membership;
    }
}
