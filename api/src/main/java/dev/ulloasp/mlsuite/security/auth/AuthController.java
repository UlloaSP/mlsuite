package dev.ulloasp.mlsuite.security.auth;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.security.identity.ClientNetworks;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.user.application.dto.UserDto;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final ClientNetworks clientNetworks = new ClientNetworks();

    @PostMapping("/register")
    public ResponseEntity<UserDto> register(
            @Valid @RequestBody AuthRequest request,
            HttpServletRequest servletRequest) {
        Authentication authentication = authService.register(request, clientNetworks.key(servletRequest));
        return ResponseEntity.status(HttpStatus.CREATED).body(signIn(authentication, servletRequest));
    }

    @PostMapping("/login")
    public ResponseEntity<UserDto> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest servletRequest) {
        Authentication authentication = authService.login(request, clientNetworks.key(servletRequest));
        return ResponseEntity.ok(signIn(authentication, servletRequest));
    }

    private UserDto signIn(Authentication authentication, HttpServletRequest servletRequest) {
        SecurityContextHolder.getContext().setAuthentication(authentication);
        // A session id known before sign-in may have been planted (session fixation): sign in under a new one.
        if (servletRequest.getSession(false) != null) {
            servletRequest.changeSessionId();
        }
        servletRequest.getSession(true).setAttribute(
                HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                SecurityContextHolder.getContext());
        return authService.profile(CurrentUser.from(authentication).userId());
    }
}
