package dev.ulloasp.mlsuite.security.identity;

import java.net.Inet6Address;
import java.net.InetAddress;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import java.util.HexFormat;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

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
 * request carries one, names the account. Otherwise the caller is the client address, and only
 * one source of it is believed: the header the product's nginx sets from the connection it
 * accepted, overwriting anything the client sent. X-Forwarded-For is never read, because its
 * first value is whatever the client chose. Without the header the request reached the API
 * directly (tests, development), and the socket address is the client.
 */
public class PublicCallerArgumentResolver implements HandlerMethodArgumentResolver {

    public static final String CLIENT_ADDRESS_HEADER = "X-MLSuite-Client-Address";
    private static final String HASH = "HmacSHA256";
    private static final int HASH_BYTES = 16;
    /** A provider hands one customer a whole IPv6 /64, so that network is one caller. */
    private static final int IPV6_NETWORK_BYTES = 8;

    /** Drawn at startup and never stored, so a hash cannot be matched to an address elsewhere. */
    private final SecretKeySpec hashKey = new SecretKeySpec(randomBytes(), HASH);

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
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUserPrincipal principal) {
            return new PublicCaller(true, "user:" + principal.userId());
        }
        HttpServletRequest request = webRequest.getNativeRequest(HttpServletRequest.class);
        String header = request.getHeader(CLIENT_ADDRESS_HEADER);
        String address = header == null || header.isBlank() ? request.getRemoteAddr() : header.strip();
        return new PublicCaller(false, "address:" + hash(network(address)));
    }

    private static String network(String address) {
        try {
            if (InetAddress.ofLiteral(address) instanceof Inet6Address inet6) {
                return HexFormat.of().formatHex(inet6.getAddress(), 0, IPV6_NETWORK_BYTES);
            }
        } catch (IllegalArgumentException notAnAddress) {
            // Counted as it came: whatever it is, it still names one caller.
        }
        return address;
    }

    private String hash(String network) {
        try {
            Mac mac = Mac.getInstance(HASH);
            mac.init(hashKey);
            byte[] digest = mac.doFinal(network.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(Arrays.copyOf(digest, HASH_BYTES));
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("HMAC-SHA256 is required to count public callers", ex);
        }
    }

    private static byte[] randomBytes() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return bytes;
    }
}
