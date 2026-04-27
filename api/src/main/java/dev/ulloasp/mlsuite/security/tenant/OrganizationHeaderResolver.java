package dev.ulloasp.mlsuite.security.tenant;

import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;

@Component
public class OrganizationHeaderResolver {

    public String requireOrganizationSlug() {
        String slug = resolveOrganizationSlug();
        if (slug == null) {
            throw new MissingTenantHeaderException("X-Organization-Slug");
        }
        return slug;
    }

    public String resolveOrganizationSlug() {
        String slug = currentRequest().getHeader("X-Organization-Slug");
        return slug == null || slug.isBlank() ? null : slug.trim();
    }

    private HttpServletRequest currentRequest() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes == null) {
            throw new MissingTenantHeaderException("X-Organization-Slug");
        }
        return attributes.getRequest();
    }
}
