package dev.ulloasp.mlsuite.principal.domain.model;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.UUID;

import org.hibernate.annotations.Formula;

import jakarta.annotation.Nullable;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Whoever did something: a person, a visitor of a public page, an API client or the platform. A
 * person's and a client's principal is written by the database when their row is, and outlives
 * them: deleting the account cuts the link and labels the principal with what it was, so what
 * they authored keeps an author.
 *
 * <p>Every authored row loads its principal, so a principal reads what it shows (a name, an
 * address, an avatar's time) from the person or client it stands for instead of loading them.
 */
@Entity
@Getter
@NoArgsConstructor
@Table(name = "principal")
public class Principal {

    /** A visitor, met for the first time on a public page. */
    public static Principal visitor(UUID token, OffsetDateTime now) {
        Principal visitor = new Principal();
        visitor.kind = PrincipalKind.VISITOR;
        visitor.visitorTokenSha256 = digest(token);
        visitor.createdAt = now;
        visitor.lastSeenAt = now;
        return visitor;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, updatable = false, length = 16)
    private PrincipalKind kind;

    /** The person it stands for while they have an account; written with the person's row. */
    @Column(name = "user_id", insertable = false, updatable = false)
    private @Nullable Long userId;

    /** The digest of the id a visitor's browser cookie carries; the id itself is never stored. */
    @Column(name = "visitor_token_sha256", updatable = false, length = 64)
    private @Nullable String visitorTokenSha256;

    /** The API client it stands for while the client exists; written with the client's row. */
    @Column(name = "api_client_id", insertable = false, updatable = false)
    private @Nullable Long apiClientId;

    @Column(name = "former_label", insertable = false, updatable = false)
    private @Nullable String formerLabel;

    @Column(name = "created_at", nullable = false, updatable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    @Column(name = "last_seen_at", columnDefinition = "TIMESTAMPTZ")
    private @Nullable OffsetDateTime lastSeenAt;

    @Formula("(SELECT u.full_name FROM app_user u WHERE u.id = user_id)")
    private @Nullable String userName;

    @Formula("(SELECT u.email FROM app_user u WHERE u.id = user_id)")
    private @Nullable String userEmail;

    @Formula("(SELECT a.updated_at FROM user_avatar a WHERE a.user_id = user_id)")
    private @Nullable OffsetDateTime userAvatarUpdatedAt;

    @Formula("(SELECT c.name FROM api_client c WHERE c.id = api_client_id)")
    private @Nullable String clientName;

    /** How the principal is shown: the person's or client's current name, or what it was; null for a visitor. */
    public @Nullable String label() {
        if (userName != null) return userName;
        if (clientName != null) return clientName;
        return formerLabel;
    }

    /** The person's address while they have an account. */
    public @Nullable String email() {
        return userEmail;
    }

    public @Nullable Long userId() {
        return userId;
    }

    public boolean isVisitor() {
        return kind == PrincipalKind.VISITOR;
    }

    /** How a visitor's cookie id is stored and looked up. */
    public static String digest(UUID token) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(token.toString().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException missing) {
            throw new IllegalStateException("SHA-256 is required to keep visitor ids", missing);
        }
    }
}
