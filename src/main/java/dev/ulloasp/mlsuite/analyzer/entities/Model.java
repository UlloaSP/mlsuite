package dev.ulloasp.mlsuite.analyzer.entities;

import java.time.OffsetDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import dev.ulloasp.mlsuite.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.ForeignKey;
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

@Table(name = "model", uniqueConstraints = {
        @UniqueConstraint(name = "uq_model_name_user", columnNames = { "name", "user_id" })
})
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Model {

    public Model(User user, String name, byte[] blob) {
        this.user = user;
        this.name = name;
        this.blob = blob;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false, foreignKey = @ForeignKey(name = "fk_model_user", foreignKeyDefinition = "FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE"))
    private User user;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "blob", nullable = false, columnDefinition = "BYTEA")
    private byte[] blob;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime updatedAt;
}
