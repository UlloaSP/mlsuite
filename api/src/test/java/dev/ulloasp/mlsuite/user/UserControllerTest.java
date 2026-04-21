package dev.ulloasp.mlsuite.user;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;

import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import dev.ulloasp.mlsuite.user.controller.UserControllerImpl;
import dev.ulloasp.mlsuite.user.dto.UserDto;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.exceptions.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.service.UserService;
import jakarta.servlet.http.HttpServletRequest;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock
    private CurrentUserResolver currentUserResolver;

    @Mock
    private UserService userService;

    @Mock
    private OAuth2AuthenticationToken authentication;

    @Mock
    private HttpServletRequest request;

    private UserControllerImpl controller;

    @BeforeEach
    void setUp() {
        controller = new UserControllerImpl(currentUserResolver, userService);
    }

    @Test
    void getProfile_UsesResolvedInternalUser() {
        User user = new User();
        user.setId(9L);
        user.setUsername("alice");
        user.setEmail("alice@example.com");
        user.setOauthProvider(OAuthProvider.GITHUB);
        user.setFullName("Alice");
        user.setCreatedAt(OffsetDateTime.of(2026, 4, 17, 12, 0, 0, 0, ZoneOffset.UTC));
        when(currentUserResolver.resolve(authentication)).thenReturn(new CurrentUser(9L, "alice"));
        when(userService.getProfile(9L)).thenReturn(user);

        ResponseEntity<UserDto> response = controller.getProfile(authentication);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(9L, response.getBody().getId());
        verify(userService).getProfile(9L);
    }

    @Test
    void getProfile_PropagatesMissingUser() {
        when(currentUserResolver.resolve(authentication)).thenReturn(new CurrentUser(9L, "alice"));
        when(userService.getProfile(9L)).thenThrow(new UserDoesNotExistException(9L));

        assertThrows(UserDoesNotExistException.class, () -> controller.getProfile(authentication));
    }

    @Test
    void handleUserDoesNotExistException_ReturnsNotFound() {
        when(request.getRequestURI()).thenReturn("/api/user/profile");

        ResponseEntity<?> response = controller.handleUserDoesNotExistException(new UserDoesNotExistException(9L),
                request);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }
}
