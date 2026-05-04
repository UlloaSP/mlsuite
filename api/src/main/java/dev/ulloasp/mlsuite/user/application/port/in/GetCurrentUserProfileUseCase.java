package dev.ulloasp.mlsuite.user.application.port.in;

import dev.ulloasp.mlsuite.user.domain.exception.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.domain.model.User;

public interface GetCurrentUserProfileUseCase {

    User getProfile(Long userId) throws UserDoesNotExistException;
}
