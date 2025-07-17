package dev.ulloasp.mlsuite.user.service;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.exceptions.UserAlreadyActiveException;
import dev.ulloasp.mlsuite.user.exceptions.UserAlreadyDeactivatedException;
import dev.ulloasp.mlsuite.user.exceptions.UserAlreadyExistsException;
import dev.ulloasp.mlsuite.user.exceptions.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.repository.UserRepository;

@Service
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;

    public UserServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public void signUp(String username, String email, OAuthProvider oauthProvider, String oauthId, String displayName, String avatarUrl, String fullName) throws UserAlreadyExistsException {
        if (this.userRepository.existsByOauthProviderAndOauthId(oauthProvider, oauthId)) {
            throw new UserAlreadyExistsException(oauthProvider.toString(), oauthId);
        }

        User newUser = new User(username, email, oauthProvider, oauthId, displayName, avatarUrl, fullName);
        this.userRepository.save(newUser);
    }

    @Override
    public void signIn(OAuthProvider oauthProvider, String oauthId) throws UserDoesNotExistException {
        Optional<User> optionalUser = this.userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId);
        if (optionalUser.isEmpty()) {
            throw new UserDoesNotExistException(oauthProvider.toString(), oauthId);
        }

    }

    @Override
    public User getProfile(String oauthId, OAuthProvider oauthProvider) throws UserDoesNotExistException {
        Optional<User> optionalUser = this.userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId);
        if (optionalUser.isEmpty()) {
            throw new UserDoesNotExistException(oauthProvider.toString(), oauthId);
        }

        return optionalUser.get();

    }

    @Override
    public User updateProfile(String oauthId, OAuthProvider oauthProvider, String displayName) throws UserDoesNotExistException {
        Optional<User> optionalUser = this.userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId);
        if (optionalUser.isEmpty()) {
            throw new UserDoesNotExistException(oauthProvider.toString(), oauthId);
        }

        User user = optionalUser.get();
        user.setDisplayName(displayName);
        return this.userRepository.save(user);
    }

    @Override
    public User deactivateAccount(String oauthId, OAuthProvider oauthProvider) throws UserDoesNotExistException, UserAlreadyDeactivatedException {
        Optional<User> optionalUser = this.userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId);
        if (optionalUser.isEmpty()) {
            throw new UserDoesNotExistException(oauthProvider.toString(), oauthId);
        }

        User user = optionalUser.get();

        if (!user.getIsActive()) {
            throw new UserAlreadyDeactivatedException();
        }

        user.setIsActive(false);
        return this.userRepository.save(user);
    }

    @Override
    public User activateAccount(String oauthId, OAuthProvider oauthProvider) throws UserDoesNotExistException, UserAlreadyActiveException {

        Optional<User> optionalUser = this.userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId);
        if (optionalUser.isEmpty()) {
            throw new UserDoesNotExistException(oauthProvider.toString(), oauthId);
        }

        User user = optionalUser.get();

        if (user.getIsActive()) {
            throw new UserAlreadyActiveException();
        }

        user.setIsActive(true);
        return this.userRepository.save(user);
    }

}
