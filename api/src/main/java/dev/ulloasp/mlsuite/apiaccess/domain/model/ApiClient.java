package dev.ulloasp.mlsuite.apiaccess.domain.model;

import dev.ulloasp.mlsuite.principal.domain.model.Principal;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Optional;
import java.util.Set;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.CascadeType;
import jakarta.persistence.OneToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Outside software an organization lets run some of its bookmarks, named after it. It calls
 * with any of its keys and may run exactly the bookmarks it was given, whether or not they are
 * public. The database removes it, its keys and its access with the organization.
 */
@Entity
@Table(name = "api_client")
@Getter
@Setter
@NoArgsConstructor
public class ApiClient {

    public static final int NAME_MAX_LENGTH = 80;
    public static final int DESCRIPTION_MAX_LENGTH = 400;
    public static final int SUSPENSION_REASON_MAX_LENGTH = 400;

    public ApiClient(Organization organization, String name, String description, Principal createdBy) {
        this.organization = organization;
        this.name = name;
        this.description = description;
        this.createdBy = createdBy;
        this.updatedBy = createdBy;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "organization_id", nullable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_api_client_organization"))
    private Organization organization;

    @Column(name = "name", nullable = false, length = NAME_MAX_LENGTH)
    private String name;

    @Column(name = "description", length = DESCRIPTION_MAX_LENGTH)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    private ApiClientStatus status = ApiClientStatus.ACTIVE;

    @Column(name = "suspension_reason", length = SUSPENSION_REASON_MAX_LENGTH)
    private String suspensionReason;

    @Column(name = "suspended_at", columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime suspendedAt;

    @Getter(AccessLevel.NONE)
    @OneToMany(mappedBy = "client", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<ApiClientBookmark> grants = new LinkedHashSet<>();

    /** The bookmarks it may run. */
    public Set<SchemaBookmark> getBookmarks() {
        Set<SchemaBookmark> bookmarks = new LinkedHashSet<>();
        grants.forEach(grant -> bookmarks.add(grant.getBookmark()));
        return Collections.unmodifiableSet(bookmarks);
    }

    /** Lets it run the bookmark; false when it already could. */
    public boolean grant(SchemaBookmark bookmark, Principal by) {
        if (grants.stream().anyMatch(grant -> grant.getBookmark().getId().equals(bookmark.getId()))) return false;
        grants.add(new ApiClientBookmark(this, bookmark, by));
        return true;
    }

    /** Stops it running the bookmark, if it could. */
    public Optional<SchemaBookmark> revoke(Long bookmarkId) {
        Optional<ApiClientBookmark> grant = grants.stream()
                .filter(candidate -> candidate.getBookmark().getId().equals(bookmarkId)).findFirst();
        grant.ifPresent(grants::remove);
        return grant.map(ApiClientBookmark::getBookmark);
    }

    /** Who created it. */
    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by_principal_id", nullable = false, updatable = false)
    private Principal createdBy;

    /** Who changed it last. */
    @ManyToOne(optional = false)
    @JoinColumn(name = "updated_by_principal_id", nullable = false)
    private Principal updatedBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime updatedAt;

    public boolean isSuspended() {
        return status == ApiClientStatus.SUSPENDED;
    }

    public void suspend(String reason, OffsetDateTime at) {
        this.status = ApiClientStatus.SUSPENDED;
        this.suspensionReason = reason;
        this.suspendedAt = at;
    }

    public void reinstate() {
        this.status = ApiClientStatus.ACTIVE;
        this.suspensionReason = null;
        this.suspendedAt = null;
    }
}
