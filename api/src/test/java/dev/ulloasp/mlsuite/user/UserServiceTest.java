package dev.ulloasp.mlsuite.user;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.exceptions.UserAlreadyExistsException;
import dev.ulloasp.mlsuite.user.exceptions.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.repository.UserRepository;
import dev.ulloasp.mlsuite.user.service.UserServiceImpl;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    private UserServiceImpl userService;

    @BeforeEach
    void setUp() {
        userService = new UserServiceImpl(userRepository);
    }

    @Test
    void signUp_Success() {
        when(userRepository.existsByOauthProviderAndOauthId(OAuthProvider.GITHUB, "ext-1")).thenReturn(false);

        userService.signUp("alice", "alice@example.com", OAuthProvider.GITHUB, "ext-1", "avatar", "Alice");

        verify(userRepository).save(any(User.class));
    }

    @Test
    void signUp_ThrowsWhenUserExists() {
        when(userRepository.existsByOauthProviderAndOauthId(OAuthProvider.GITHUB, "ext-1")).thenReturn(true);

        assertThrows(UserAlreadyExistsException.class,
                () -> userService.signUp("alice", "alice@example.com", OAuthProvider.GITHUB, "ext-1", "avatar",
                        "Alice"));

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void signIn_ThrowsWhenUserMissing() {
        when(userRepository.existsByOauthProviderAndOauthId(OAuthProvider.GITHUB, "ext-1")).thenReturn(false);

        assertThrows(UserDoesNotExistException.class, () -> userService.signIn(OAuthProvider.GITHUB, "ext-1"));
    }

    @Test
    void getProfile_UsesInternalUserId() {
        User user = new User();
        user.setId(7L);
        user.setUsername("alice");
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));

        User result = userService.getProfile(7L);

        assertEquals(7L, result.getId());
        assertEquals("alice", result.getUsername());
        verify(userRepository).findById(7L);
    }

    @Test
    void getProfile_ThrowsWhenInternalUserMissing() {
        when(userRepository.findById(7L)).thenReturn(Optional.empty());

        UserDoesNotExistException exception = assertThrows(UserDoesNotExistException.class,
                () -> userService.getProfile(7L));

        assertEquals("User with ID '7' does not exist", exception.getMessage());
    }
}
