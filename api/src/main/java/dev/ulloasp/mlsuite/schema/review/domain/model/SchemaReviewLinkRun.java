package dev.ulloasp.mlsuite.schema.review.domain.model;

import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
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
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "schema_review_link_run", uniqueConstraints = {
        @UniqueConstraint(name = "uq_schema_review_link_run", columnNames = { "schema_review_link_id", "prediction_run_id" })
})
public class SchemaReviewLinkRun {
    public SchemaReviewLinkRun(SchemaReviewLink reviewLink, PredictionRun run) {
        this.reviewLink = reviewLink;
        this.run = run;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "schema_review_link_id", nullable = false, foreignKey = @ForeignKey(name = "fk_schema_review_run_link"))
    private SchemaReviewLink reviewLink;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "prediction_run_id", nullable = false, foreignKey = @ForeignKey(name = "fk_schema_review_run_prediction_run"))
    private PredictionRun run;
}
