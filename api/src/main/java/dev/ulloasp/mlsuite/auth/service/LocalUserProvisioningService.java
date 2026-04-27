package dev.ulloasp.mlsuite.auth.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.auth.exceptions.EmailAlreadyExistsException;
import dev.ulloasp.mlsuite.auth.exceptions.UsernameAlreadyExistsException;
import dev.ulloasp.mlsuite.auth.validation.PasswordPolicy;
import dev.ulloasp.mlsuite.organization.services.OrganizationProvisioningService;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.repository.UserRepository;

@Service
@Transactional
public class LocalUserProvisioningService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicy passwordPolicy;
    private final OrganizationProvisioningService organizationProvisioningService;

    public LocalUserProvisioningService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            PasswordPolicy passwordPolicy,
            OrganizationProvisioningService organizationProvisioningService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.passwordPolicy = passwordPolicy;
        this.organizationProvisioningService = organizationProvisioningService;
    }

    public User register(String email, String password, String fullName, String username) {
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new EmailAlreadyExistsException(email);
        }
        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new UsernameAlreadyExistsException(username);
        }
        passwordPolicy.validate(password);
        User user = new User(username, email, passwordEncoder.encode(password), null, fullName);
        User saved = userRepository.save(user);
        organizationProvisioningService.ensurePersonalOrganization(saved);
        return saved;
    }

    public User setPassword(String email, String rawPassword) {
        passwordPolicy.validate(rawPassword);
        User user = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        return userRepository.save(user);
    }
}
