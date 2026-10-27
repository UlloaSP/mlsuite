package dev.ulloasp.mlsuite.security.identity;

import java.util.UUID;

import org.springframework.core.MethodParameter;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import dev.ulloasp.mlsuite.security.auth.AuthenticatedUserPrincipal;
import jakarta.servlet.http.HttpServletRequest;

/**
 * Supplies the {@link PublicCaller} of a request that needs no session. A session, when the
 * request carries one, names the account. Otherwise the caller is the network the request came
 * from, as {@link ClientNetworks} names it. A visitor cookie, when the request carries one, names
 * the visitor; whether that visitor exists is for the service that reads it to decide.
 */
public class PublicCallerArgumentResolver implements HandlerMethodArgumentResolver {

    private final ClientNetworks networks = new ClientNetworks();

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return PublicCaller.class.equals(parameter.getParameterType());
    }

    @Override
    public PublicCaller resolveArgument(
            MethodParameter parameter,
            ModelAndViewContainer mavContainer,
            NativeWebRequest webRequest,
            WebDataBinderFactory binderFactory) {
        HttpServletRequest request = webRequest.getNativeRequest(HttpServletRequest.class);
        UUID visitorId = VisitorCookie.read(request);
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUserPrincipal principal) {
            return PublicCaller.signedIn(principal.userId(), visitorId);
        }
        return PublicCaller.anonymous(networks.key(request), visitorId);
    }
}
