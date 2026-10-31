package dev.ulloasp.mlsuite.security.auth;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.user.application.dto.UserDto;
import dev.ulloasp.mlsuite.user.domain.exception.UserAlreadyExistsException;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.PersonalAccountService;
import lombok.RequiredArgsConstructor;

@Service
@Transactional
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PersonalAccountService personalAccountService;
    private final AuthenticationManager authenticationManager;
    private final AuthAttemptLimiter attemptLimiter;

    /** Creates the account and signs it in; every attempt counts against the caller's network. */
    public Authentication register(AuthRequest request, String caller) {
        attemptLimiter.admitRegistration(caller);
        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new UserAlreadyExistsException(email);
        }
        String handle = personalAccountService.claimHandle(request.username());
        User user = new User(
                handle,
                email,
                passwordEncoder.encode(request.password()),
                request.fullName() == null || request.fullName().isBlank() ? handle : request.fullName().trim(),
                SystemRole.USER);
        userRepository.save(user);
        personalAccountService.open(user);
        return authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, request.password()));
    }

    /** Signs in, or counts the failure against the caller's network once it has failures left. */
    public Authentication login(LoginRequest request, String caller) {
        attemptLimiter.checkLogin(caller);
        try {
            return authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email(), request.password()));
        } catch (AuthenticationException failure) {
            attemptLimiter.recordLoginFailure(caller);
            throw failure;
        }
    }

    public UserDto profile(Long userId) {
        return UserDto.toDto(userRepository.findById(userId).orElseThrow());
    }
}
