package dev.ulloasp.mlsuite.organization.domain.model;

import java.time.OffsetDateTime;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * The organization's logo as it is served: already square and small, so every reader shows the
 * same bytes. Stored by the organization's id and dropped with it.
 */
@Entity
@Getter
@NoArgsConstructor
@Table(name = "organization_logo")
public class OrganizationLogo {

    public OrganizationLogo(Long organizationId, byte[] content, String contentType, OffsetDateTime updatedAt) {
        this.organizationId = organizationId;
        this.content = content;
        this.contentType = contentType;
        this.updatedAt = updatedAt;
    }

    @Id
    @Column(name = "organization_id")
    private Long organizationId;

    @JdbcTypeCode(SqlTypes.VARBINARY)
    @Column(name = "content", nullable = false)
    private byte[] content;

    @Column(name = "content_type", nullable = false, length = 40)
    private String contentType;

    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime updatedAt;
}
