package dev.ulloasp.mlsuite.audit.application.dto;

import dev.ulloasp.mlsuite.user.domain.model.User;

/** Who acted: a member, or a platform administrator acting on the organization's resources. */
public record AuditActorDto(Long id, String name) {

    public static AuditActorDto from(User user) {
        return new AuditActorDto(user.getId(), user.getFullName());
    }
}
