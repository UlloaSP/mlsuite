package dev.ulloasp.mlsuite.user.entity;

import java.time.OffsetDateTime;
import java.util.Objects;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/**
 * User entity representing the app_user table. Manages user authentication and
 * profile information with OAuth2 integration.
 */
@Entity
@Table(name = "app_user",
        uniqueConstraints = {
            @UniqueConstraint(name = "uq_app_user_oauth", columnNames = {"oauth_provider", "oauth_id"})
        },
        indexes = {
            @Index(name = "idx_app_user_created_at", columnList = "created_at DESC"),
            @Index(name = "idx_app_user_active_true", columnList = "id")
        })
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "username", nullable = false, length = 50)
    private String username;

    @Column(name = "email", nullable = false, columnDefinition = "CITEXT")
    private String email;

    @Enumerated(EnumType.ORDINAL)
    @Column(name = "oauth_provider", nullable = false)
    private OAuthProvider oauthProvider;

    @Column(name = "oauth_id", nullable = false)
    private String oauthId;

    @Column(name = "display_name", length = 50)
    private String displayName;

    @Column(name = "avatar_url", columnDefinition = "TEXT")
    private String avatarUrl;

    @Column(name = "full_name", length = 150)
    private String fullName;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", foreignKey = @ForeignKey(name = "fk_created_by"))
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by", foreignKey = @ForeignKey(name = "fk_updated_by"))
    private User updatedBy;

    // ============================================
    // Constructors
    // ============================================
    /**
     * Default constructor for JPA
     */
    public User() {
    }

    /**
     * Constructor with required fields
     */
    public User(String username, String email, OAuthProvider oauthProvider, String oauthId) {
        this.username = username;
        this.email = email;
        this.oauthProvider = oauthProvider;
        this.oauthId = oauthId;
        this.isActive = true;
    }

    public User(String username, String email, OAuthProvider oauthProvider,
            String displayName, String avatarUrl, String fullName, boolean isActive, OffsetDateTime createdAt) {
        this.username = username;
        this.email = email;
        this.oauthProvider = oauthProvider;
        this.displayName = displayName;
        this.avatarUrl = avatarUrl;
        this.fullName = fullName;
        this.isActive = isActive;
        this.createdAt = createdAt;
    }

    /**
     * Constructor with all user-settable fields
     */
    public User(String username, String email, OAuthProvider oauthProvider, String oauthId,
            String displayName, String avatarUrl, String fullName) {
        this(username, email, oauthProvider, oauthId);
        this.displayName = displayName;
        this.avatarUrl = avatarUrl;
        this.fullName = fullName;
    }

    // ============================================
    // Getters and Setters
    // ============================================
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public OAuthProvider getOauthProvider() {
        return oauthProvider;
    }

    public void setOauthProvider(OAuthProvider oauthProvider) {
        this.oauthProvider = oauthProvider;
    }

    public String getOauthId() {
        return oauthId;
    }

    public void setOauthId(String oauthId) {
        this.oauthId = oauthId;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(boolean isActive) {
        this.isActive = isActive;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public User getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(User createdBy) {
        this.createdBy = createdBy;
    }

    public User getUpdatedBy() {
        return updatedBy;
    }

    public void setUpdatedBy(User updatedBy) {
        this.updatedBy = updatedBy;
    }

    // ============================================
    // Business Methods
    // ============================================
    /**
     * Activates the user account
     */
    public void activate() {
        this.isActive = true;
    }

    /**
     * Deactivates the user account
     */
    public void deactivate() {
        this.isActive = false;
    }

    /**
     * Updates the user's profile information
     */
    public void updateProfile(String displayName, String avatarUrl) {
        this.displayName = displayName;
        this.avatarUrl = avatarUrl;
    }

    /**
     * Checks if avatar URL is valid (starts with http:// or https://)
     */
    public boolean isAvatarUrlValid() {
        return avatarUrl == null || avatarUrl.matches("^https?://.*");
    }

    // ============================================
    // Object Methods
    // ============================================
    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        User user = (User) o;
        return Objects.equals(id, user.id)
                && Objects.equals(username, user.username)
                && Objects.equals(email, user.email)
                && oauthProvider == user.oauthProvider
                && Objects.equals(oauthId, user.oauthId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, username, email, oauthProvider, oauthId);
    }

    @Override
    public String toString() {
        return "User{"
                + "id=" + id
                + ", username='" + username + '\''
                + ", email='" + email + '\''
                + ", oauthProvider=" + oauthProvider
                + ", oauthId='" + oauthId + '\''
                + ", displayName='" + displayName + '\''
                + ", avatarUrl='" + avatarUrl + '\''
                + ", isActive=" + isActive
                + ", createdAt=" + createdAt
                + ", updatedAt=" + updatedAt
                + '}';
    }
}
