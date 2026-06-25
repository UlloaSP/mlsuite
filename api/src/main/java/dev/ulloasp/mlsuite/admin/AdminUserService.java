package dev.ulloasp.mlsuite.admin;

import java.util.List;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.user.domain.exception.UserAlreadyExistsException;
import dev.ulloasp.mlsuite.user.domain.exception.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceBootstrapService;

@Service
@Transactional
public class AdminUserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final WorkspaceBootstrapService workspaceBootstrapService;

    public AdminUserService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            WorkspaceBootstrapService workspaceBootstrapService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.workspaceBootstrapService = workspaceBootstrapService;
    }

    public List<AdminUserDto> list() {
        return userRepository.findAll().stream().map(AdminUserDto::from).toList();
    }

    public AdminUserDto create(AdminCreateUserRequest request) {
        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new UserAlreadyExistsException(email);
        }
        User user = new User(
                username(request.username(), email),
                email,
                passwordEncoder.encode(request.password()),
                request.fullName().trim(),
                role(request.systemRole()));
        user.setEnabled(request.enabled() == null || request.enabled());
        userRepository.save(user);
        workspaceBootstrapService.ensureCurrentOrganization(user);
        return AdminUserDto.from(user);
    }

    public AdminUserDto update(Long id, AdminUpdateUserRequest request) {
        User user = user(id);
        SystemRole nextRole = request.systemRole() == null ? user.getSystemRole() : role(request.systemRole());
        boolean nextEnabled = request.enabled() == null ? user.isEnabled() : request.enabled();
        guardLastSuperadmin(user, nextRole, nextEnabled);
        if (request.fullName() != null && !request.fullName().isBlank()) {
            user.setFullName(request.fullName().trim());
        }
        if (request.username() != null && !request.username().isBlank()) {
            user.setUsername(request.username().trim());
        }
        user.setSystemRole(nextRole);
        user.setEnabled(nextEnabled);
        return AdminUserDto.from(user);
    }

    public void resetPassword(Long id, AdminPasswordRequest request) {
        user(id).setPasswordHash(passwordEncoder.encode(request.password()));
    }

    public void delete(Long id) {
        User user = user(id);
        guardLastSuperadmin(user, SystemRole.USER, false);
        userRepository.delete(user);
    }

    private User user(Long id) {
        return userRepository.findById(id).orElseThrow(() -> new UserDoesNotExistException(id));
    }

    private void guardLastSuperadmin(User user, SystemRole nextRole, boolean nextEnabled) {
        if (user.getSystemRole() == SystemRole.SUPERADMIN
                && (nextRole != SystemRole.SUPERADMIN || !nextEnabled)
                && userRepository.countBySystemRoleAndEnabledTrue(SystemRole.SUPERADMIN) <= 1) {
            throw new IllegalArgumentException("Cannot remove the last enabled superadmin.");
        }
    }

    private SystemRole role(String role) {
        if (role == null || role.isBlank()) {
            return SystemRole.USER;
        }
        return SystemRole.valueOf(role.trim().toUpperCase());
    }

    private String username(String username, String email) {
        return username == null || username.isBlank() ? email.substring(0, email.indexOf("@")) : username.trim();
    }
}
