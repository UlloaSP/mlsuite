package dev.ulloasp.mlsuite.security.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.organization.domain.model.Handle;
import dev.ulloasp.mlsuite.workspace.application.service.PersonalAccountService;

@Component
public class SuperadminSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PersonalAccountService personalAccountService;
    private final String email;
    private final String password;
    private final String fullName;
    private final String username;

    public SuperadminSeeder(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            PersonalAccountService personalAccountService,
            @Value("${mlsuite.superadmin.email:}") String email,
            @Value("${mlsuite.superadmin.password:}") String password,
            @Value("${mlsuite.superadmin.full-name:}") String fullName,
            @Value("${mlsuite.superadmin.username:}") String username) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.personalAccountService = personalAccountService;
        this.email = email;
        this.password = password;
        this.fullName = fullName;
        this.username = username;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (email == null || email.isBlank()) {
            return;
        }
        String normalizedEmail = email.trim().toLowerCase();
        User user = userRepository.findByEmailIgnoreCase(normalizedEmail).orElse(null);
        boolean created = user == null;
        if (created) {
            if (password == null || password.isBlank()) {
                throw new IllegalStateException("MLSUITE_SUPERADMIN_PASSWORD is required for initial superadmin.");
            }
            // The operator names this account, so a reserved handle such as "admin" is theirs to use.
            user = new User(
                    Handle.parse(username(normalizedEmail)),
                    normalizedEmail,
                    passwordEncoder.encode(password),
                    fullName(normalizedEmail),
                    SystemRole.SUPERADMIN);
        } else if (password != null && !password.isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(password));
        }
        user.setSystemRole(SystemRole.SUPERADMIN);
        user.setEnabled(true);
        userRepository.save(user);
        if (created) {
            personalAccountService.open(user);
        }
    }

    private String username(String email) {
        return username == null || username.isBlank() ? email.substring(0, email.indexOf("@")) : username.trim();
    }

    private String fullName(String email) {
        return fullName == null || fullName.isBlank() ? username(email) : fullName.trim();
    }
}
