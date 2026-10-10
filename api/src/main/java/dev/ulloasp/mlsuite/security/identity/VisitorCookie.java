package dev.ulloasp.mlsuite.security.identity;

import java.time.Duration;
import java.util.UUID;

import org.springframework.http.ResponseCookie;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;

/**
 * The cookie that names a visitor without an account to the public surface. It is the only
 * thing that ties a browser to its runs, so it is kept for a year, read by no script, sent
 * only to {@code /api/public}, and only on same-site requests and top-level navigations
 * ({@code SameSite=Lax}): another site cannot act as the visitor. It is marked {@code Secure}
 * when the page came over HTTPS, which the product's nginx tells by X-Forwarded-Proto.
 */
public final class VisitorCookie {

    public static final String NAME = "mlsuite_visitor";
    static final String PATH = "/api/public";
    static final Duration MAX_AGE = Duration.ofDays(365);

    private VisitorCookie() {
    }

    /** The visitor id the request carries, or null without a cookie or with one that is not an id. */
    public static UUID read(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (Cookie cookie : cookies) {
            if (NAME.equals(cookie.getName())) {
                try {
                    return UUID.fromString(cookie.getValue());
                } catch (IllegalArgumentException notAnId) {
                    return null;
                }
            }
        }
        return null;
    }

    public static ResponseCookie issue(UUID visitorId, HttpServletRequest request) {
        return ResponseCookie.from(NAME, visitorId.toString())
                .httpOnly(true)
                .secure(isSecure(request))
                .sameSite("Lax")
                .path(PATH)
                .maxAge(MAX_AGE)
                .build();
    }

    private static boolean isSecure(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-Proto");
        return forwarded == null ? request.isSecure() : "https".equalsIgnoreCase(forwarded.strip());
    }
}
