package dev.ulloasp.mlsuite.security.auth;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;

import jakarta.servlet.http.HttpServletRequest;

/** Makes {@code authentication} what the request's session speaks for. */
final class SessionSignIn {

    private SessionSignIn() {
    }

    static void adopt(Authentication authentication, HttpServletRequest request) {
        SecurityContextHolder.getContext().setAuthentication(authentication);
        // A session id known before sign-in may have been planted (session fixation): sign in under a new one.
        if (request.getSession(false) != null) {
            request.changeSessionId();
        }
        request.getSession(true).setAttribute(
                HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                SecurityContextHolder.getContext());
    }
}
