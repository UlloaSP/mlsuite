package dev.ulloasp.mlsuite.schema.application.service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.util.Base64;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Seals the predictions the server performs, so that the browser which asked for one can hand it
 * back when the member saves the run, and opens only seals this server made. A seal is the
 * prediction's JSON and an HMAC-SHA256 of those exact bytes, each in URL-safe Base64, joined by a
 * dot; the run stores what the seal holds, never values sent beside it. A seal is valid for
 * {@link #LIFETIME}: long enough for a session of runs to be reviewed before saving, short enough
 * that an old execution cannot be saved indefinitely.
 */
@Component
public class PredictionAttestations {

    static final Duration LIFETIME = Duration.ofHours(24);
    /** Clocks of one host disagree by little; a seal from further ahead was not made here. */
    private static final Duration CLOCK_SKEW = Duration.ofMinutes(1);
    private static final int MIN_SECRET_LENGTH = 32;
    private static final String ALGORITHM = "HmacSHA256";
    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DECODER = Base64.getUrlDecoder();

    private final ObjectMapper objectMapper;
    private final SecretKeySpec key;
    private final Clock clock;

    @Autowired
    public PredictionAttestations(ObjectMapper objectMapper,
            @Value("${mlsuite.prediction-attestation.secret}") String secret) {
        this(objectMapper, secret, Clock.systemUTC());
    }

    PredictionAttestations(ObjectMapper objectMapper, String secret, Clock clock) {
        if (secret == null || secret.strip().length() < MIN_SECRET_LENGTH) {
            throw new IllegalStateException("PREDICTION_ATTESTATION_SECRET must be set to a random value of at least "
                    + MIN_SECRET_LENGTH + " characters");
        }
        this.objectMapper = objectMapper;
        this.key = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), ALGORITHM);
        this.clock = clock;
    }

    /** The prediction as performed now, sealed. */
    String seal(AttestedPrediction prediction) {
        try {
            byte[] payload = objectMapper.writeValueAsBytes(prediction);
            return ENCODER.encodeToString(payload) + "." + ENCODER.encodeToString(mac(payload));
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("A prediction could not be sealed", ex);
        }
    }

    /** The current time as a seal records it. */
    long now() {
        return clock.millis();
    }

    /**
     * What a seal holds, once it is known to be this server's and still valid. Anything else, a
     * malformed, altered, foreign or expired seal, is refused as a bad request.
     */
    AttestedPrediction open(String seal) {
        int dot = seal == null ? -1 : seal.indexOf('.');
        if (dot <= 0 || dot != seal.lastIndexOf('.')) throw notProduced();
        byte[] payload;
        byte[] signature;
        try {
            payload = DECODER.decode(seal.substring(0, dot));
            signature = DECODER.decode(seal.substring(dot + 1));
        } catch (IllegalArgumentException ex) {
            throw notProduced();
        }
        if (!MessageDigest.isEqual(mac(payload), signature)) throw notProduced();
        AttestedPrediction prediction;
        try {
            prediction = objectMapper.readValue(payload, AttestedPrediction.class);
        } catch (IOException ex) {
            throw notProduced();
        }
        long age = clock.millis() - prediction.issuedAt();
        if (age > LIFETIME.toMillis() || age < -CLOCK_SKEW.toMillis()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "A prediction result has expired; run the inference again before saving");
        }
        return prediction;
    }

    private byte[] mac(byte[] payload) {
        try {
            Mac mac = Mac.getInstance(ALGORITHM);
            mac.init(key);
            return mac.doFinal(payload);
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException(ALGORITHM + " is unavailable", ex);
        }
    }

    private static ResponseStatusException notProduced() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "A prediction result was not produced by this server; run the inference again before saving");
    }
}
