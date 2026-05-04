package dev.ulloasp.mlsuite.user.application.port.in;

import dev.ulloasp.mlsuite.user.domain.exception.UserAlreadyExistsException;
import dev.ulloasp.mlsuite.user.domain.model.OAuthProvider;

public interface SignUpUserUseCase {

    void signUp(
            String username,
            String email,
            OAuthProvider oauthProvider,
            String oauthId,
            String avatarUrl,
            String fullName) throws UserAlreadyExistsException;
}
