package dev.ulloasp.mlsuite.admin;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.user.domain.exception.UserAlreadyExistsException;
import dev.ulloasp.mlsuite.user.domain.exception.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceBootstrapService;
import jakarta.persistence.criteria.Predicate;

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

    public AdminUserPageDto list(int page, int size, String search, String sort, String role) {
        Page<User> users = userRepository.findAll(
                filter(search, role),
                PageRequest.of(Math.max(0, page), Math.max(1, Math.min(size, 100)), sort(sort)));
        return new AdminUserPageDto(
                users.getContent().stream().map(AdminUserDto::from).toList(),
                users.getTotalElements(),
                users.hasNext());
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

    private Specification<User> filter(String search, String role) {
        return (root, query, criteriaBuilder) -> {
            Predicate predicate = criteriaBuilder.conjunction();
            SystemRole filterRole = filterRole(role);
            if (filterRole != null) {
                predicate = criteriaBuilder.and(predicate, criteriaBuilder.equal(root.get("systemRole"), filterRole));
            }
            String term = search == null ? "" : search.trim().toLowerCase();
            if (!term.isBlank()) {
                String pattern = "%" + term + "%";
                predicate = criteriaBuilder.and(
                        predicate,
                        criteriaBuilder.or(
                                criteriaBuilder.like(criteriaBuilder.lower(root.get("fullName")), pattern),
                                criteriaBuilder.like(criteriaBuilder.lower(root.get("email")), pattern),
                                criteriaBuilder.like(criteriaBuilder.lower(root.get("username")), pattern)));
            }
            return predicate;
        };
    }

    private SystemRole filterRole(String role) {
        if (role == null || role.isBlank() || "all".equalsIgnoreCase(role)) {
            return null;
        }
        try {
            return SystemRole.valueOf(role.trim().toUpperCase());
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    private Sort sort(String sort) {
        return switch (sort == null ? "current" : sort.trim().toLowerCase()) {
            case "name" -> Sort.by(
                    Sort.Order.asc("fullName").ignoreCase(),
                    Sort.Order.asc("email").ignoreCase());
            case "newest" -> Sort.by(Sort.Order.desc("createdAt"));
            case "oldest" -> Sort.by(Sort.Order.asc("createdAt"));
            default -> Sort.by(Sort.Order.asc("id"));
        };
    }
}
