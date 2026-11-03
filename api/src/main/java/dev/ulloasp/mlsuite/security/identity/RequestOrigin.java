package dev.ulloasp.mlsuite.security.identity;

import java.util.UUID;

import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.annotation.Nullable;
import jakarta.servlet.http.HttpServletRequest;

/**
 * Where the request being served came from, read from the thread that serves it: the client's
 * address as {@link ClientNetworks} believes it, and an id the request is given the first time it
 * is asked for one. Work outside a request has neither.
 */
public record RequestOrigin(@Nullable String ip, @Nullable UUID requestId) {

    private static final String REQUEST_ID = RequestOrigin.class.getName() + ".id";
    private static final int MAX_ADDRESS = 64;

    public static RequestOrigin current() {
        HttpServletRequest request = request();
        if (request == null) return new RequestOrigin(null, null);
        String address = ClientNetworks.address(request);
        return new RequestOrigin(address.length() <= MAX_ADDRESS ? address : address.substring(0, MAX_ADDRESS),
                idOf(request));
    }

    /** The request's id; outside a request, simply a new one. */
    public static UUID currentRequestId() {
        HttpServletRequest request = request();
        return request == null ? UUID.randomUUID() : idOf(request);
    }

    private static UUID idOf(HttpServletRequest request) {
        if (request.getAttribute(REQUEST_ID) instanceof UUID id) return id;
        UUID id = UUID.randomUUID();
        request.setAttribute(REQUEST_ID, id);
        return id;
    }

    private static HttpServletRequest request() {
        return RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes
                ? attributes.getRequest()
                : null;
    }
}
