package dev.ulloasp.mlsuite.organization;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import dev.ulloasp.mlsuite.organization.entities.Organization;
import dev.ulloasp.mlsuite.organization.entities.OrganizationUser;
import dev.ulloasp.mlsuite.organization.entities.OrganizationUserStatus;
import dev.ulloasp.mlsuite.organization.repositories.OrganizationUserRepository;
import dev.ulloasp.mlsuite.organization.services.OrganizationAccessService;
import dev.ulloasp.mlsuite.organization.services.OrganizationProvisioningService;
import dev.ulloasp.mlsuite.rbac.entities.Role;
import dev.ulloasp.mlsuite.rbac.entities.UserRole;
import dev.ulloasp.mlsuite.rbac.repositories.UserRoleRepository;
import dev.ulloasp.mlsuite.security.tenant.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.user.entity.User;

@ExtendWith(MockitoExtension.class)
class OrganizationAccessServiceTest {

    @Mock
    private OrganizationUserRepository organizationUserRepository;

    @Mock
    private UserRoleRepository userRoleRepository;

    @Mock
    private OrganizationProvisioningService organizationProvisioningService;

    private OrganizationAccessService service;

    @BeforeEach
    void setUp() {
        service = new OrganizationAccessService(
                organizationUserRepository,
                userRoleRepository,
                organizationProvisioningService);
    }

    @Test
    void requireActiveMembership_ReturnsActiveMembership() {
        User user = user(4L, "alice");
        OrganizationUser membership = membership(user, 9L, "acme", "Acme", OrganizationUserStatus.ACTIVE);
        when(organizationUserRepository.findByUserIdAndOrganizationSlug(4L, "acme")).thenReturn(Optional.of(membership));

        OrganizationUser result = service.requireActiveMembership(user, "acme");

        assertEquals("acme", result.getOrganization().getSlug());
        verify(organizationProvisioningService).ensurePersonalOrganization(user);
    }

    @Test
    void requireActiveMembership_ThrowsWhenSuspended() {
        User user = user(4L, "alice");
        OrganizationUser membership = membership(user, 9L, "acme", "Acme", OrganizationUserStatus.SUSPENDED);
        when(organizationUserRepository.findByUserIdAndOrganizationSlug(4L, "acme")).thenReturn(Optional.of(membership));

        assertThrows(OrganizationAccessDeniedException.class, () -> service.requireActiveMembership(user, "acme"));
    }

    @Test
    void resolveActiveMembershipOrDefault_ReturnsFirstActiveMembership() {
        User user = user(7L, "bob");
        OrganizationUser membership = membership(user, 12L, "bob-7", "Bob Workspace", OrganizationUserStatus.ACTIVE);
        when(organizationUserRepository.findByUserIdAndStatusOrderByOrganizationNameAsc(7L, OrganizationUserStatus.ACTIVE))
                .thenReturn(List.of(membership));

        OrganizationUser result = service.resolveActiveMembershipOrDefault(user, null);

        assertEquals("bob-7", result.getOrganization().getSlug());
    }

    @Test
    void listActiveOrganizations_ReturnsDistinctSortedRoles() {
        User user = user(8L, "charlie");
        OrganizationUser membership = membership(user, 15L, "charlie-8", "Charlie Workspace", OrganizationUserStatus.ACTIVE);
        when(organizationUserRepository.findByUserIdAndStatusOrderByOrganizationNameAsc(8L, OrganizationUserStatus.ACTIVE))
                .thenReturn(List.of(membership));
        when(userRoleRepository.findByUserIdAndOrganizationIdIn(8L, List.of(15L)))
                .thenReturn(List.of(userRole(membership.getOrganization(), user, "member"), userRole(membership.getOrganization(), user, "admin"),
                        userRole(membership.getOrganization(), user, "member")));

        var result = service.listActiveOrganizations(user);

        assertEquals(List.of("admin", "member"), result.getFirst().roleNames());
    }

    private User user(Long id, String username) {
        User user = new User();
        user.setId(id);
        user.setUsername(username);
        return user;
    }

    private OrganizationUser membership(User user, Long id, String slug, String name, OrganizationUserStatus status) {
        Organization organization = new Organization();
        organization.setId(id);
        organization.setSlug(slug);
        organization.setName(name);
        OrganizationUser membership = new OrganizationUser();
        membership.setOrganization(organization);
        membership.setUser(user);
        membership.setStatus(status);
        return membership;
    }

    private UserRole userRole(Organization organization, User user, String roleName) {
        Role role = new Role();
        role.setId((long) roleName.hashCode());
        role.setName(roleName);
        UserRole userRole = new UserRole();
        userRole.setOrganization(organization);
        userRole.setUser(user);
        userRole.setRole(role);
        return userRole;
    }
}
