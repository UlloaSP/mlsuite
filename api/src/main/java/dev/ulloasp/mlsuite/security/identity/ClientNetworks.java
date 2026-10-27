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

import jakarta.servlet.http.HttpServletRequest;

/**
 * Names the network a request came from without holding its address: a keyed hash of it. Only
 * one source of the address is believed: the header the product's nginx sets from the connection
 * it accepted, overwriting anything the client sent. X-Forwarded-For is never read, because its
 * first value is whatever the client chose. Without the header the request reached the API
 * directly (tests, development), and the socket address is the client.
 */
public class ClientNetworks {

    public static final String CLIENT_ADDRESS_HEADER = "X-MLSuite-Client-Address";
    private static final String HASH = "HmacSHA256";
    private static final int HASH_BYTES = 16;
    /** A provider hands one customer a whole IPv6 /64, so that network is one caller. */
    private static final int IPV6_NETWORK_BYTES = 8;

    /** Drawn at startup and never stored, so a hash cannot be matched to an address elsewhere. */
    private final SecretKeySpec hashKey = new SecretKeySpec(randomBytes(), HASH);

    /** The caller key of the request's network, {@code address:<hash>}. */
    public String key(HttpServletRequest request) {
        String header = request.getHeader(CLIENT_ADDRESS_HEADER);
        String address = header == null || header.isBlank() ? request.getRemoteAddr() : header.strip();
        return "address:" + hash(network(address));
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
            throw new IllegalStateException("HMAC-SHA256 is required to count callers by network", ex);
        }
    }

    private static byte[] randomBytes() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return bytes;
    }
}
