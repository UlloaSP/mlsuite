package dev.ulloasp.mlsuite.user.adapter.out.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import dev.ulloasp.mlsuite.user.domain.model.UserAvatar;

@Repository
public interface UserAvatarRepository extends JpaRepository<UserAvatar, Long> {
}
