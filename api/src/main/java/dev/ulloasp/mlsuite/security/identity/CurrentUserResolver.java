package dev.ulloasp.mlsuite.security.identity;

import dev.ulloasp.mlsuite.organization.entities.OrganizationUser;
import dev.ulloasp.mlsuite.organization.services.OrganizationAccessService;
import dev.ulloasp.mlsuite.rbac.services.PermissionEvaluator;
import dev.ulloasp.mlsuite.security.local.LocalUserDetails;
import dev.ulloasp.mlsuite.security.tenant.OrganizationHeaderResolver;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.service.UserLookupService;

@Component
public class CurrentUserResolver {

    private final UserLookupService userLookupService;
    private final OrganizationAccessService organizationAccessService;
    private final OrganizationHeaderResolver organizationHeaderResolver;
    private final PermissionEvaluator permissionEvaluator;

    @Autowired
    public CurrentUserResolver(
            UserLookupService userLookupService,
            OrganizationAccessService organizationAccessService,
            OrganizationHeaderResolver organizationHeaderResolver,
            PermissionEvaluator permissionEvaluator) {
        this.userLookupService = userLookupService;
        this.organizationAccessService = organizationAccessService;
        this.organizationHeaderResolver = organizationHeaderResolver;
        this.permissionEvaluator = permissionEvaluator;
    }

    public CurrentUserResolver(
            UserLookupService userLookupService) {
        this(userLookupService, null, null, null);
    }

    public CurrentUser resolve(Authentication authentication) {
        User user = resolveUser(authentication);
        if (organizationAccessService == null || organizationHeaderResolver == null || permissionEvaluator == null) {
            return new CurrentUser(user.getId(), user.getUsername());
        }
        OrganizationUser membership = organizationAccessService.requireActiveMembership(
                user,
                organizationHeaderResolver.requireOrganizationSlug());
        return buildCurrentUser(user, membership);
    }

    public CurrentUser resolveProfile(Authentication authentication) {
        User user = resolveUser(authentication);
        if (organizationAccessService == null || organizationHeaderResolver == null || permissionEvaluator == null) {
            return new CurrentUser(user.getId(), user.getUsername());
        }
        OrganizationUser membership = organizationAccessService.resolveActiveMembershipOrDefault(
                user,
                organizationHeaderResolver.resolveOrganizationSlug());
        return buildCurrentUser(user, membership);
    }

    private User resolveUser(Authentication authentication) {
        Object principal = authentication.getPrincipal();
        if (principal instanceof LocalUserDetails localUserDetails) {
            return userLookupService.requireById(localUserDetails.userId());
        }
        return userLookupService.requireByEmail(authentication.getName());
    }

    private CurrentUser buildCurrentUser(User user, OrganizationUser membership) {
        return new CurrentUser(
                user.getId(),
                user.getUsername(),
                membership.getOrganization().getId(),
                membership.getOrganization().getSlug(),
                membership.getOrganization().getName(),
                user.isSuperadmin(),
                permissionEvaluator.resolvePermissions(
                        membership.getOrganization().getId(),
                        user.getId(),
                        user.isSuperadmin()));
    }
}
