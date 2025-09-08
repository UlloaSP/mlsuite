package dev.ulloasp.mlsuite.model.entities;

import java.time.OffsetDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

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

    public Model(User user, String name, String type, String specific_type, String fileName, byte[] modelFile) {
        this.user = user;
        this.name = name;
        this.type = type;
        this.specificType = specific_type;
        this.fileName = fileName;
        this.modelFile = modelFile;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false, foreignKey = @ForeignKey(name = "fk_model_user", foreignKeyDefinition = "FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE"))
    private User user;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "type", nullable = false, length = 255)
    private String type;

    @Column(name = "specific_type", nullable = false, length = 255)
    private String specificType;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @JdbcTypeCode(SqlTypes.VARBINARY)
    @Column(name = "model_file", nullable = false)
    private byte[] modelFile;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime updatedAt;
}
