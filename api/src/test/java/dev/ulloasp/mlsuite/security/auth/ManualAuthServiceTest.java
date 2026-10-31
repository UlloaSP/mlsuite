package dev.ulloasp.mlsuite.security.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.mock;

import java.time.Clock;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.admin.AdminCreateUserRequest;
import dev.ulloasp.mlsuite.admin.AdminUpdateUserRequest;
import dev.ulloasp.mlsuite.admin.AdminUserService;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.user.domain.exception.UserAlreadyExistsException;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceBootstrapService;

@ExtendWith(MockitoExtension.class)
class ManualAuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private WorkspaceBootstrapService workspaceBootstrapService;

    @Mock
    private AuthenticationManager authenticationManager;

    private AuthService authService;
    private AdminUserService adminUserService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userRepository,
                passwordEncoder,
                workspaceBootstrapService,
                authenticationManager,
                new AuthAttemptLimiter(10, 5, Clock.systemUTC()), mock(AuditLogService.class));
        adminUserService = new AdminUserService(
                userRepository,
                passwordEncoder,
                workspaceBootstrapService, mock(AuditLogService.class));
    }

    @Test
    void register_CreatesNormalUserAndBootstrapsWorkspace() {
        when(userRepository.existsByEmailIgnoreCase("alice@example.com")).thenReturn(false);
        when(passwordEncoder.encode("very-secret")).thenReturn("hash");

        authService.register(new AuthRequest("Alice@Example.com", "very-secret", "Alice", ""), "address:test");

        verify(userRepository).save(org.mockito.ArgumentMatchers.argThat(user ->
                user.getEmail().equals("alice@example.com")
                        && user.getPasswordHash().equals("hash")
                        && user.getSystemRole() == SystemRole.USER));
        verify(workspaceBootstrapService).ensureCurrentOrganization(org.mockito.ArgumentMatchers.any(User.class));
        verify(authenticationManager).authenticate(org.mockito.ArgumentMatchers.argThat(token ->
                token.getName().equals("alice@example.com")));
    }

    @Test
    void register_RejectsDuplicateEmail() {
        when(userRepository.existsByEmailIgnoreCase("alice@example.com")).thenReturn(true);

        assertThrows(UserAlreadyExistsException.class,
                () -> authService.register(new AuthRequest("alice@example.com", "very-secret", "Alice", null),
                        "address:test"));
    }

    @Test
    void adminCreate_CanCreateSuperadmin() {
        when(userRepository.existsByEmailIgnoreCase("root@example.com")).thenReturn(false);
        when(passwordEncoder.encode("very-secret")).thenReturn("hash");

        var dto = adminUserService.create(9L, new AdminCreateUserRequest(
                "root@example.com",
                "very-secret",
                "Root",
                "root",
                "SUPERADMIN",
                true));

        assertEquals(SystemRole.SUPERADMIN, dto.systemRole());
        verify(workspaceBootstrapService).ensureCurrentOrganization(org.mockito.ArgumentMatchers.any(User.class));
    }

    @Test
    void adminUpdate_RejectsDemotingLastEnabledSuperadmin() {
        User root = new User("root", "root@example.com", "hash", "Root", SystemRole.SUPERADMIN);
        root.setId(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(root));
        when(userRepository.countBySystemRoleAndEnabledTrue(SystemRole.SUPERADMIN)).thenReturn(1L);

        assertThrows(IllegalArgumentException.class,
                () -> adminUserService.update(9L, 1L, new AdminUpdateUserRequest(null, null, "USER", true)));
    }

    @Test
    void adminDelete_RemovesNormalUser() {
        User target = new User("user", "user@example.com", "hash", "User", SystemRole.USER);
        target.setId(2L);
        when(userRepository.findById(2L)).thenReturn(Optional.of(target));

        adminUserService.delete(9L, 2L);

        verify(userRepository).deleteAllByIdInBatch(java.util.List.of(target.getId()));
    }

    @Test
    void adminDelete_RejectsLastEnabledSuperadmin() {
        User root = new User("root", "root@example.com", "hash", "Root", SystemRole.SUPERADMIN);
        root.setId(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(root));
        when(userRepository.countBySystemRoleAndEnabledTrue(SystemRole.SUPERADMIN)).thenReturn(1L);

        assertThrows(IllegalArgumentException.class, () -> adminUserService.delete(9L, 1L));
    }
}
