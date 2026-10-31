package dev.ulloasp.mlsuite.user.domain.model;

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
 * A person's avatar as it is served: already square and small, so every reader shows the same
 * bytes. Stored by the user's id and dropped with them.
 */
@Entity
@Getter
@NoArgsConstructor
@Table(name = "user_avatar")
public class UserAvatar {

    public UserAvatar(Long userId, byte[] content, String contentType, OffsetDateTime updatedAt) {
        this.userId = userId;
        this.content = content;
        this.contentType = contentType;
        this.updatedAt = updatedAt;
    }

    @Id
    @Column(name = "user_id")
    private Long userId;

    @JdbcTypeCode(SqlTypes.VARBINARY)
    @Column(name = "content", nullable = false)
    private byte[] content;

    @Column(name = "content_type", nullable = false, length = 40)
    private String contentType;

    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime updatedAt;
}
