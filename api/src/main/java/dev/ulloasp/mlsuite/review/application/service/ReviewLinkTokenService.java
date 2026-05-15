package dev.ulloasp.mlsuite.review.application.service;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Set;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

@Service
public class ReviewLinkTokenService {

    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;
    private final SecureRandom random = new SecureRandom();
    private final ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());
    private final byte[] key;

    public ReviewLinkTokenService(Environment environment) {
        this.key = resolveKey(environment);
    }

    public String encrypt(ReviewLinkTokenPayload payload) {
        try {
            byte[] iv = new byte[IV_BYTES];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(TAG_BITS, iv));
            byte[] plaintext = mapper.writeValueAsBytes(payload);
            byte[] encrypted = cipher.doFinal(plaintext);
            return Base64.getUrlEncoder().withoutPadding().encodeToString(ByteBuffer.allocate(iv.length + encrypted.length)
                    .put(iv)
                    .put(encrypted)
                    .array());
        } catch (Exception e) {
            throw new IllegalStateException("Failed to create review token", e);
        }
    }

    public ReviewLinkTokenPayload decrypt(String token) {
        try {
            byte[] packed = Base64.getUrlDecoder().decode(token);
            ByteBuffer buffer = ByteBuffer.wrap(packed);
            byte[] iv = new byte[IV_BYTES];
            buffer.get(iv);
            byte[] encrypted = new byte[buffer.remaining()];
            buffer.get(encrypted);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(TAG_BITS, iv));
            return mapper.readValue(cipher.doFinal(encrypted), ReviewLinkTokenPayload.class);
        } catch (Exception e) {
            throw new ReviewLinkUnavailableException();
        }
    }

    public String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to hash review token", e);
        }
    }

    private byte[] resolveKey(Environment environment) {
        String secret = environment.getProperty("REVIEW_LINK_SECRET", "");
        if (!secret.isBlank()) {
            return decodeSecret(secret);
        }
        Set<String> profiles = Set.of(environment.getActiveProfiles());
        if (profiles.contains("prod")) {
            throw new IllegalStateException("REVIEW_LINK_SECRET is required in prod");
        }
        try {
            return MessageDigest.getInstance("SHA-256")
                    .digest("mlsuite-local-review-link-secret".getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException("Failed to derive local review token key", e);
        }
    }

    private byte[] decodeSecret(String secret) {
        byte[] decoded;
        try {
            decoded = Base64.getDecoder().decode(secret);
        } catch (IllegalArgumentException e) {
            decoded = HexFormat.of().parseHex(secret);
        }
        if (decoded.length != 32) {
            throw new IllegalStateException("REVIEW_LINK_SECRET must decode to 32 bytes");
        }
        return decoded;
    }
}
