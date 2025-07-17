package dev.ulloasp.mlsuite.user.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.user.entity.User;

/**
 * Repository interface for User entity operations. Provides data access methods
 * for user management.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Finds a user by OAuth provider and OAuth ID
     */
    Optional<User> findByOauthProviderAndOauthId(OAuthProvider oauthProvider, String oauthId);

    /**
     * Checks if an OAuth provider and ID combination already exists
     */
    boolean existsByOauthProviderAndOauthId(OAuthProvider oauthProvider, String oauthId);
}
