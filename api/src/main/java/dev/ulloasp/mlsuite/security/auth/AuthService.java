package dev.ulloasp.mlsuite.security.auth;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.user.application.dto.UserDto;
import dev.ulloasp.mlsuite.user.domain.exception.UserAlreadyExistsException;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceBootstrapService;
import lombok.RequiredArgsConstructor;

@Service
@Transactional
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final WorkspaceBootstrapService workspaceBootstrapService;

    public UserDto register(AuthRequest request) {
        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new UserAlreadyExistsException(email);
        }
        User user = new User(
                username(request.username(), email),
                email,
                passwordEncoder.encode(request.password()),
                fullName(request.fullName(), email),
                SystemRole.USER);
        userRepository.save(user);
        workspaceBootstrapService.ensureCurrentOrganization(user);
        return UserDto.toDto(user);
    }

    public UserDto profile(Long userId) {
        User user = userRepository.findById(userId).orElseThrow();
        workspaceBootstrapService.ensureCurrentOrganization(user);
        return UserDto.toDto(user);
    }

    private String username(String username, String email) {
        if (username != null && !username.isBlank()) {
            return username.trim();
        }
        return email.substring(0, email.indexOf("@"));
    }

    private String fullName(String fullName, String email) {
        if (fullName != null && !fullName.isBlank()) {
            return fullName.trim();
        }
        return username(null, email);
    }
}
