package dev.ulloasp.mlsuite.schema.review.domain.model;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.user.domain.model.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
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
@Table(name = "schema_review_run_submission", uniqueConstraints = {
        @UniqueConstraint(name = "uq_schema_review_run_submission", columnNames = { "schema_review_run_id", "user_id" })
})
public class SchemaReviewRunSubmission {
    public SchemaReviewRunSubmission(SchemaReviewRun reviewRun, User user, OffsetDateTime submittedAt) {
        this.reviewRun = reviewRun;
        this.user = user;
        this.submittedAt = submittedAt;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "schema_review_run_id", nullable = false, foreignKey = @ForeignKey(name = "fk_schema_review_submission_run"))
    private SchemaReviewRun reviewRun;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, foreignKey = @ForeignKey(name = "fk_schema_review_submission_user"))
    private User user;

    @Column(name = "submitted_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime submittedAt;
}
