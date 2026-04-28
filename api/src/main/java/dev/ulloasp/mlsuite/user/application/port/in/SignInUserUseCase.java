package dev.ulloasp.mlsuite.user.application.port.in;

import dev.ulloasp.mlsuite.user.domain.exception.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.domain.model.OAuthProvider;

public interface SignInUserUseCase {

    void signIn(OAuthProvider oauthProvider, String oauthId) throws UserDoesNotExistException;
}
