package dev.ulloasp.mlsuite.apiaccess.domain.model;

import jakarta.persistence.PrePersist;
import java.time.OffsetDateTime;

import org.hibernate.annotations.CreationTimestamp;

import dev.ulloasp.mlsuite.principal.domain.model.Principal;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * A bookmark a client may run, and the member who gave it. The organization and schema the row
 * carries for its keys are read from the client and the bookmark when it is written.
 */
@Entity
@Table(name = "api_client_bookmark")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ApiClientBookmark {

    ApiClientBookmark(ApiClient client, SchemaBookmark bookmark, Principal grantedBy) {
        this.client = client;
        this.bookmark = bookmark;
        this.createdBy = grantedBy;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "api_client_id", nullable = false, updatable = false)
    private ApiClient client;

    @ManyToOne(optional = false)
    @JoinColumn(name = "schema_bookmark_id", nullable = false, updatable = false)
    private SchemaBookmark bookmark;

    /** Who gave the client this bookmark. */
    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by_principal_id", nullable = false, updatable = false)
    private Principal createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    /** Carried from its parent for the composite foreign key that keeps it there. */
    @Column(name = "organization_id", nullable = false, updatable = false)
    private Long organizationId;

    /** Carried from its parent for the composite foreign key that keeps it there. */
    @Column(name = "schema_id", nullable = false, updatable = false)
    private Long schemaId;

    @PrePersist
    void carryParentKeys() {
        organizationId = client.getOrganization().getId();
        schemaId = bookmark.getSchema().getId();
    }
}
