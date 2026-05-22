package dev.ulloasp.mlsuite.review.domain.model;

import dev.ulloasp.mlsuite.prediction.domain.model.Prediction;
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
@Table(name = "review_link_prediction", uniqueConstraints = {
        @UniqueConstraint(name = "uq_review_link_prediction", columnNames = { "review_link_id", "prediction_id" })
})
public class ReviewLinkPrediction {

    public ReviewLinkPrediction(ReviewLink reviewLink, Prediction prediction) {
        this.reviewLink = reviewLink;
        this.prediction = prediction;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "review_link_id", nullable = false, foreignKey = @ForeignKey(name = "fk_review_link_prediction_link"))
    private ReviewLink reviewLink;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "prediction_id", nullable = false, foreignKey = @ForeignKey(name = "fk_review_link_prediction_prediction"))
    private Prediction prediction;
}
