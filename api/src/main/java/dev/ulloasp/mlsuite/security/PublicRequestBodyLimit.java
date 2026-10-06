package dev.ulloasp.mlsuite.security;

import java.util.Set;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Anonymous callers may send only small bodies to /api/public. The declared length is checked
 * before the body is parsed, and a body without one is refused, so nothing unbounded is read
 * into memory on behalf of a visitor.
 */
@Configuration
public class PublicRequestBodyLimit implements WebMvcConfigurer, HandlerInterceptor {

    static final int MAX_BODY_BYTES = 64 * 1024;
    private static final Set<String> BODY_METHODS = Set.of("POST", "PUT", "PATCH");

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(this).addPathPatterns("/api/public/**");
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!BODY_METHODS.contains(request.getMethod())) return true;
        long length = request.getContentLengthLong();
        if (length < 0) {
            throw new ResponseStatusException(HttpStatus.LENGTH_REQUIRED, "Send the request with a Content-Length.");
        }
        if (length > MAX_BODY_BYTES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "The request is too large.");
        }
        return true;
    }
}
