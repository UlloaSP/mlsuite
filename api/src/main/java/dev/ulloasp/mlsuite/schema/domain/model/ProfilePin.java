package dev.ulloasp.mlsuite.schema.domain.model;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.OffsetDateTime;
import dev.ulloasp.mlsuite.principal.domain.model.Principal;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A bookmark its owner keeps at the top of their profile, at {@code slot} among at most
 * {@value #MAX_PINS}. The bookmark owns the rule that a pin needs a readable bookmark: it drops its
 * pin when it stops being one, and the database drops it with the bookmark or the user.
 */
@Entity
@Getter
@NoArgsConstructor
@Table(name = "profile_pin")
public class ProfilePin {

    public static final int MAX_PINS = 6;

    public ProfilePin(Long userId, SchemaBookmark bookmark, int slot, Principal createdBy) {
        this.userId = userId;
        this.createdBy = createdBy;
        this.updatedBy = createdBy;
        this.bookmark = bookmark;
        this.slot = slot;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "schema_bookmark_id", nullable = false, foreignKey = @ForeignKey(name = "fk_profile_pin_bookmark"))
    private SchemaBookmark bookmark;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "slot", nullable = false)
    private int slot;

    /** Moves the pin to another slot of its profile. */
    public void move(int slot, Principal by) {
        if (this.slot == slot) return;
        this.slot = slot;
        this.updatedBy = by;
    }

    /** Who created it. */
    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by_principal_id", nullable = false, updatable = false)
    private Principal createdBy;

    /** Who last moved it. */
    @ManyToOne(optional = false)
    @JoinColumn(name = "updated_by_principal_id", nullable = false)
    private Principal updatedBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime updatedAt;
}
