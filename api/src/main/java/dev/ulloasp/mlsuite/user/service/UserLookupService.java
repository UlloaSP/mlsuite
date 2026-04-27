package dev.ulloasp.mlsuite.user.service;

import org.springframework.stereotype.Service;

import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.exceptions.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.repository.UserRepository;
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

    public User requireByEmail(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new UserDoesNotExistException("email", email));
    }

    public boolean existsByEmail(String email) {
        return userRepository.existsByEmailIgnoreCase(email);
    }

    public boolean existsByUsername(String username) {
        return userRepository.existsByUsernameIgnoreCase(username);
    }
}
