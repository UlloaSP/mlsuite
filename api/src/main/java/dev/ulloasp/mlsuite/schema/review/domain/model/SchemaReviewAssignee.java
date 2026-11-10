package dev.ulloasp.mlsuite.schema.review.domain.model;

import jakarta.persistence.PrePersist;
import jakarta.persistence.Column;
import org.hibernate.annotations.CreationTimestamp;
import java.time.OffsetDateTime;
import dev.ulloasp.mlsuite.principal.domain.model.Principal;
import dev.ulloasp.mlsuite.user.domain.model.User;
import jakarta.persistence.Entity;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor
@Table(name = "schema_review_assignee", uniqueConstraints = {
        @UniqueConstraint(name = "uq_schema_review_assignee", columnNames = { "schema_review_id", "user_id" })
})
public class SchemaReviewAssignee {
    public SchemaReviewAssignee(SchemaReview review, User user, Principal createdBy) {
        this.review = review;
        this.user = user;
        this.createdBy = createdBy;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "schema_review_id", nullable = false, foreignKey = @ForeignKey(name = "fk_review_assignee_review"))
    private SchemaReview review;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false, foreignKey = @ForeignKey(name = "fk_review_assignee_user"))
    private User user;

    /** Who created it. */
    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by_principal_id", nullable = false, updatable = false)
    private Principal createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    /** Carried from its parent for the composite foreign key that keeps it there. */
    @Column(name = "organization_id", nullable = false, updatable = false)
    private Long organizationId;

    @PrePersist
    void carryParentKeys() {
        organizationId = review.getOrganization().getId();
    }
}
