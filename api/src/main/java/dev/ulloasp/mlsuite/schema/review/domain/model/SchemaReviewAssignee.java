package dev.ulloasp.mlsuite.schema.review.domain.model;

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
        @UniqueConstraint(name = "uq_schema_review_assignee", columnNames = { "review_id", "user_id" })
})
public class SchemaReviewAssignee {
    public SchemaReviewAssignee(SchemaReview review, User user) {
        this.review = review;
        this.user = user;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "review_id", nullable = false, foreignKey = @ForeignKey(name = "fk_review_assignee_review"))
    private SchemaReview review;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false, foreignKey = @ForeignKey(name = "fk_review_assignee_user"))
    private User user;
}
