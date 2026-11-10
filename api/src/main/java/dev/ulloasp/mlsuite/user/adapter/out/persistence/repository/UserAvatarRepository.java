package dev.ulloasp.mlsuite.user.adapter.out.persistence.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import dev.ulloasp.mlsuite.user.domain.model.UserAvatar;

@Repository
public interface UserAvatarRepository extends JpaRepository<UserAvatar, Long> {

    Optional<UserAvatar> findByUserId(Long userId);

    @Modifying
    @Query("DELETE FROM UserAvatar a WHERE a.userId = :userId")
    int deleteByUserId(Long userId);
}
