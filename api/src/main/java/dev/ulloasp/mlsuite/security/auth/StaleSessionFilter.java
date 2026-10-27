package dev.ulloasp.mlsuite.security.auth;

import java.io.IOException;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

/**
 * Ends a stale session ({@link SessionAccountCheck}) on the request that carries it. The request
 * then continues without a session: a protected endpoint answers 401, a public one serves it as
 * anonymous. Not a bean, so the servlet container does not run it outside the security chain.
 */
public class StaleSessionFilter extends OncePerRequestFilter {

    private final SessionAccountCheck sessionAccountCheck;

    public StaleSessionFilter(SessionAccountCheck sessionAccountCheck) {
        this.sessionAccountCheck = sessionAccountCheck;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUserPrincipal principal
                && sessionAccountCheck.isStale(principal)) {
            HttpSession session = request.getSession(false);
            if (session != null) {
                session.invalidate();
            }
            SecurityContextHolder.clearContext();
        }
        chain.doFilter(request, response);
    }
}
