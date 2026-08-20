package dev.ulloasp.mlsuite.schema.review.domain.model;

import java.util.UUID;

import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
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
@Table(name = "schema_review_run", uniqueConstraints = {
        @UniqueConstraint(name = "uq_schema_review_run", columnNames = { "schema_review_id", "prediction_run_id" })
})
public class SchemaReviewRun {
    public SchemaReviewRun(SchemaReview review, PredictionRun run) {
        this.publicId = UUID.randomUUID().toString();
        this.review = review;
        this.run = run;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "public_id", nullable = false, unique = true, length = 36)
    private String publicId;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "schema_review_id", nullable = false, foreignKey = @ForeignKey(name = "fk_schema_review_run_review"))
    private SchemaReview review;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "prediction_run_id", nullable = false, foreignKey = @ForeignKey(name = "fk_schema_review_run_prediction"))
    private PredictionRun run;
}
