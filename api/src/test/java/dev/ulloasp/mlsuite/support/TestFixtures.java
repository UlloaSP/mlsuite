package dev.ulloasp.mlsuite.support;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.EnumSet;
import java.util.Set;

import org.mockito.Mockito;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

import dev.ulloasp.mlsuite.principal.application.service.Principals;

import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.principal.domain.model.Principal;
import dev.ulloasp.mlsuite.principal.domain.model.PrincipalKind;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.storage.ArtifactHash;
import dev.ulloasp.mlsuite.storage.ArtifactSource;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.dto.WorkspacePermissionsDto;

/** Shared in-memory domain objects for unit tests. */
public final class TestFixtures {

    public static final long ORG_ID = 41L;

    private TestFixtures() {
    }

    /** The principal a person acts as, for objects that never reach the database. */
    public static Principal principal(User user) {
        Principal principal = new Principal();
        ReflectionTestUtils.setField(principal, "id", user.getId() == null ? null : 1_000_000L + user.getId());
        ReflectionTestUtils.setField(principal, "kind", PrincipalKind.USER);
        ReflectionTestUtils.setField(principal, "userId", user.getId());
        ReflectionTestUtils.setField(principal, "userName", user.getFullName());
        ReflectionTestUtils.setField(principal, "userEmail", user.getEmail());
        ReflectionTestUtils.setField(principal, "userAvatarUpdatedAt", user.getAvatarUpdatedAt());
        return principal;
    }

    /** The platform's principal, for objects that never reach the database. */
    public static Principal system() {
        Principal principal = new Principal();
        ReflectionTestUtils.setField(principal, "id", 1L);
        ReflectionTestUtils.setField(principal, "kind", PrincipalKind.SYSTEM);
        ReflectionTestUtils.setField(principal, "formerLabel", "MLsuite");
        return principal;
    }

    /** Principals for services a unit test builds: each person or id acts as {@link #principal}. */
    public static Principals principals() {
        Principals principals = Mockito.mock(Principals.class, Mockito.withSettings().strictness(Strictness.LENIENT));
        Mockito.when(principals.of(Mockito.any(User.class))).thenAnswer(call -> principal(call.getArgument(0)));
        Mockito.when(principals.user(Mockito.anyLong())).thenAnswer(call -> principal(user(call.getArgument(0))));
        Mockito.when(principals.system()).thenReturn(system());
        return principals;
    }

    public static User user(Long id) {
        User user = new User();
        user.setId(id);
        user.setUsername("user-" + id);
        user.setEmail("user" + id + "@example.com");
        user.setFullName("User " + id);
        user.setSystemRole(SystemRole.USER);
        return user;
    }

    /** Gives a model the stored artifact every persisted model names. */
    /** The runtime environment of every model the tests store (db/testdata in the test resources). */
    public static final String ENVIRONMENT_KEY = "c".repeat(64);

    public static Model storedArtifact(Model model, byte[] bytes) {
        String sha256 = ArtifactHash.sha256(bytes);
        model.setEnvironmentKey(ENVIRONMENT_KEY);
        model.setStorageBucket("test");
        model.setStorageObjectKey("organizations/1/models/" + model.getName() + "/artifacts/" + sha256 + "/model.bin");
        // Each stored artifact is its own object version, as a versioned bucket gives it.
        model.setStorageVersionId("v-" + java.util.UUID.randomUUID());
        model.setStorageEtag("etag");
        model.setModelSizeBytes((long) bytes.length);
        model.setArtifactSha256(sha256);
        model.setArtifactVerifiedAt(OffsetDateTime.now(ZoneOffset.UTC));
        return model;
    }

    /** An artifact already in memory, read as uploads and stored objects are. */
    public static ArtifactSource artifact(byte[] bytes) {
        return new ArtifactSource() {
            @Override
            public long sizeBytes() {
                return bytes.length;
            }

            @Override
            public InputStream open() {
                return new ByteArrayInputStream(bytes);
            }
        };
    }

    public static CurrentUser currentUser(Long id) {
        return new CurrentUser(id, "user-" + id, SystemRole.USER);
    }

    public static Organization organization() {
        return organization(ORG_ID);
    }

    public static Organization organization(Long id) {
        Organization organization = new Organization();
        organization.setId(id);
        organization.setName("Org");
        organization.setSlug("org");
        organization.setCreatedBy(system());
        organization.setUpdatedBy(system());
        return organization;
    }

    /** A role definition; pass a system key such as "OWNER" for system roles, or null for custom ones. */
    public static RoleDefinition role(Organization organization, String systemKey, PermissionKey... permissions) {
        String name = systemKey == null ? "Custom" : systemKey;
        RoleDefinition role = new RoleDefinition(organization, name, name.toLowerCase(), systemKey, TestFixtures.system());
        role.setPermissions(permissions.length == 0 ? EnumSet.noneOf(PermissionKey.class) : EnumSet.of(permissions[0], permissions));
        return role;
    }

    public static OrganizationMembership membership(Organization organization, User user, RoleDefinition role) {
        return new OrganizationMembership(organization, user, role, MembershipStatus.ACTIVE, TestFixtures.principal(user));
    }

    public static WorkspacePermissionsDto permissions(PermissionKey... granted) {
        return WorkspacePermissionsDto.from(granted.length == 0 ? Set.of() : EnumSet.of(granted[0], granted));
    }

    public static WorkspacePermissionsDto allPermissions() {
        return WorkspacePermissionsDto.from(EnumSet.allOf(PermissionKey.class));
    }
}
