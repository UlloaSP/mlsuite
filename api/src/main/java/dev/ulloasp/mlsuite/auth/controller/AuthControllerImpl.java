package dev.ulloasp.mlsuite.auth.controller;

import static org.springframework.security.web.context.HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.auth.dto.LoginRequest;
import dev.ulloasp.mlsuite.auth.dto.RegisterRequest;
import dev.ulloasp.mlsuite.auth.exceptions.AccountDisabledException;
import dev.ulloasp.mlsuite.auth.exceptions.EmailAlreadyExistsException;
import dev.ulloasp.mlsuite.auth.exceptions.InvalidCredentialsException;
import dev.ulloasp.mlsuite.auth.exceptions.UsernameAlreadyExistsException;
import dev.ulloasp.mlsuite.auth.service.AuthService;
import dev.ulloasp.mlsuite.organization.services.OrganizationAccessService;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import dev.ulloasp.mlsuite.user.dto.UserDto;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.service.UserService;
import dev.ulloasp.mlsuite.util.ErrorDto;
import jakarta.servlet.http.HttpServletRequest;

@RestController
public class AuthControllerImpl implements AuthController {

    private final AuthService authService;
    private final CurrentUserResolver currentUserResolver;
    private final UserService userService;
    private final OrganizationAccessService organizationAccessService;

    public AuthControllerImpl(
            AuthService authService,
            CurrentUserResolver currentUserResolver,
            UserService userService,
            OrganizationAccessService organizationAccessService) {
        this.authService = authService;
        this.currentUserResolver = currentUserResolver;
        this.userService = userService;
        this.organizationAccessService = organizationAccessService;
    }

    @Override
    public ResponseEntity<UserDto> register(RegisterRequest request, HttpServletRequest servletRequest) {
        Authentication authentication = authService.register(request).authentication();
        return ResponseEntity.status(HttpStatus.CREATED).body(authenticateAndBuild(authentication, servletRequest));
    }

    @Override
    public ResponseEntity<UserDto> login(LoginRequest request, HttpServletRequest servletRequest) {
        Authentication authentication = authService.login(request).authentication();
        return ResponseEntity.ok(authenticateAndBuild(authentication, servletRequest));
    }

    @Override
    public ResponseEntity<Void> logout(HttpServletRequest servletRequest) {
        SecurityContextHolder.clearContext();
        if (servletRequest.getSession(false) != null) {
            servletRequest.getSession(false).invalidate();
        }
        return ResponseEntity.noContent().build();
    }

    private UserDto authenticateAndBuild(Authentication authentication, HttpServletRequest servletRequest) {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        servletRequest.getSession(true).setAttribute(SPRING_SECURITY_CONTEXT_KEY, context);
        CurrentUser currentUser = currentUserResolver.resolveProfile(authentication);
        User user = userService.getProfile(currentUser.userId());
        return UserDto.toDto(user, currentUser, organizationAccessService.listActiveOrganizations(user));
    }

    @ExceptionHandler(EmailAlreadyExistsException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ResponseEntity<ErrorDto> handleEmailAlreadyExists(EmailAlreadyExistsException e, HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ErrorDto.of(HttpStatus.CONFLICT.value(), e.getMessage(), req.getRequestURI()));
    }

    @ExceptionHandler(UsernameAlreadyExistsException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ResponseEntity<ErrorDto> handleUsernameAlreadyExists(
            UsernameAlreadyExistsException e,
            HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ErrorDto.of(HttpStatus.CONFLICT.value(), e.getMessage(), req.getRequestURI()));
    }

    @ExceptionHandler({ InvalidCredentialsException.class })
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ResponseEntity<ErrorDto> handleInvalidCredentials(RuntimeException e, HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ErrorDto.of(HttpStatus.UNAUTHORIZED.value(), e.getMessage(), req.getRequestURI()));
    }

    @ExceptionHandler({ AccountDisabledException.class })
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ResponseEntity<ErrorDto> handleDisabled(RuntimeException e, HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ErrorDto.of(HttpStatus.FORBIDDEN.value(), e.getMessage(), req.getRequestURI()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ErrorDto> handleBadRequest(IllegalArgumentException e, HttpServletRequest req) {
        return ResponseEntity.badRequest()
                .body(ErrorDto.of(HttpStatus.BAD_REQUEST.value(), e.getMessage(), req.getRequestURI()));
    }
}
