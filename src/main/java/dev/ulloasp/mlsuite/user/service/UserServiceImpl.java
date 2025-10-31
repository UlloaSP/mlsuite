package dev.ulloasp.mlsuite.user.service;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.user.entity.User;
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
    public void signUp(String username, String email, OAuthProvider oauthProvider, String oauthId, String avatarUrl,
            String fullName) throws UserAlreadyExistsException {
        if (this.userRepository.existsByOauthProviderAndOauthId(oauthProvider, oauthId)) {
            throw new UserAlreadyExistsException(oauthProvider.toString(), oauthId);
        }

        User newUser = new User(username, email, oauthProvider, oauthId, avatarUrl, fullName);
        this.userRepository.save(newUser);
    }

    @Override
    public void signIn(OAuthProvider oauthProvider, String oauthId) throws UserDoesNotExistException {
        if (!this.userRepository.existsByOauthProviderAndOauthId(oauthProvider, oauthId)) {
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
}
