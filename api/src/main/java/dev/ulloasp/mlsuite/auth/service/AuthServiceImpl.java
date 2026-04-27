package dev.ulloasp.mlsuite.auth.service;

import java.time.OffsetDateTime;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.auth.dto.AuthResult;
import dev.ulloasp.mlsuite.auth.dto.LoginRequest;
import dev.ulloasp.mlsuite.auth.dto.RegisterRequest;
import dev.ulloasp.mlsuite.auth.exceptions.AccountDisabledException;
import dev.ulloasp.mlsuite.auth.exceptions.InvalidCredentialsException;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.repository.UserRepository;

@Service
@Transactional
public class AuthServiceImpl implements AuthService {

    private final LocalUserProvisioningService localUserProvisioningService;
    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;

    public AuthServiceImpl(
            LocalUserProvisioningService localUserProvisioningService,
            AuthenticationManager authenticationManager,
            UserRepository userRepository) {
        this.localUserProvisioningService = localUserProvisioningService;
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        }

    @Override
    public AuthResult register(RegisterRequest request) {
        localUserProvisioningService.register(
                request.email().trim(),
                request.password(),
                request.fullName().trim(),
                request.username().trim());
        return login(new LoginRequest(request.email().trim(), request.password()));
    }

    @Override
    public AuthResult login(LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(
                            request.email().trim(),
                            request.password()));
            User user = userRepository.findByEmailIgnoreCase(request.email().trim()).orElseThrow();
            user.setLastLoginAt(OffsetDateTime.now());
            return new AuthResult(user.getEmail(), authentication);
        } catch (DisabledException | LockedException ex) {
            throw new AccountDisabledException();
        } catch (BadCredentialsException ex) {
            throw new InvalidCredentialsException();
        }
    }
}
