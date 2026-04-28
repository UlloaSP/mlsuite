package dev.ulloasp.mlsuite.user.application.service;

import org.springframework.stereotype.Service;

import dev.ulloasp.mlsuite.security.identity.ExternalIdentity;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.user.domain.exception.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import jakarta.transaction.Transactional;

@Service
@Transactional
public class UserLookupService {

    private final UserRepository userRepository;

    public UserLookupService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User requireById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new UserDoesNotExistException(userId));
    }

    public User requireByExternalIdentity(ExternalIdentity identity) {
        return userRepository.findByOauthProviderAndOauthId(identity.provider(), identity.subject())
                .orElseThrow(() -> new UserDoesNotExistException(
                        identity.provider().toString(),
                        identity.subject()));
    }
}

