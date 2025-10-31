package dev.ulloasp.mlsuite.user.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.user.entity.User;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByOauthProviderAndOauthId(OAuthProvider oauthProvider, String oauthId);

    boolean existsByOauthProviderAndOauthId(OAuthProvider oauthProvider, String oauthId);
}
