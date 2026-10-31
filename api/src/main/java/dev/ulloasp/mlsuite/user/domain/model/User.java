/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.user.domain.model;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "app_user", uniqueConstraints = {
        @UniqueConstraint(name = "uq_app_user_email", columnNames = { "email" }),
        @UniqueConstraint(name = "uq_app_user_username", columnNames = { "username" })
})
public class User {

    public static final int BIO_MAX_LENGTH = 280;
    public static final int FACT_MAX_LENGTH = 100;
    public static final int URL_MAX_LENGTH = 255;
    public static final int MAX_PROFILE_LINKS = 4;

    public User(String username, String email, String passwordHash, String fullName, SystemRole systemRole) {
        this.username = username;
        this.email = email;
        this.fullName = fullName;
        this.passwordHash = passwordHash;
        this.systemRole = systemRole;
        this.enabled = true;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "username", nullable = false, length = 50)
    private String username;

    @Column(name = "email", nullable = false, length = 100)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    /** When the avatar in {@code user_avatar} was last replaced; null while there is none. */
    @Column(name = "avatar_updated_at", columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime avatarUpdatedAt;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(name = "bio", length = BIO_MAX_LENGTH)
    private String bio;

    @Column(name = "location", length = FACT_MAX_LENGTH)
    private String location;

    @Column(name = "website", length = URL_MAX_LENGTH)
    private String website;

    @Column(name = "company", length = FACT_MAX_LENGTH)
    private String company;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "profile_links", nullable = false)
    private List<String> profileLinks = new ArrayList<>();

    /** Whether anyone may read the profile; to anyone else a private one does not exist. */
    @Column(name = "profile_public", nullable = false)
    private boolean profilePublic = true;

    @Column(name = "profile_shows_organizations", nullable = false)
    private boolean profileShowsOrganizations;

    @Enumerated(EnumType.STRING)
    @Column(name = "system_role", nullable = false, length = 32)
    private SystemRole systemRole = SystemRole.USER;

    @Column(name = "enabled", nullable = false)
    private boolean enabled = true;

    /**
     * The organization the user last selected; null leaves them in their personal account. Lazy
     * because an organization names users: eager, the cycle joins a user dozens of times into every
     * statement that reaches one, past what PostgreSQL allows in a select list.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_organization_id")
    private Organization currentOrganization;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime updatedAt;

    /** The handle their profile answers at, while anyone may read it; null otherwise. */
    public String visibleHandle() {
        return enabled && profilePublic ? username : null;
    }
}

