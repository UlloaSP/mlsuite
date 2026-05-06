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
import org.springframework.security.core.Authentication;

import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import dev.ulloasp.mlsuite.user.adapter.in.web.UserControllerImpl;
import dev.ulloasp.mlsuite.user.application.port.in.GetCurrentUserProfileUseCase;
import dev.ulloasp.mlsuite.user.application.dto.UserDto;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.user.domain.exception.UserDoesNotExistException;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock
    private CurrentUserResolver currentUserResolver;

    @Mock
    private GetCurrentUserProfileUseCase getCurrentUserProfileUseCase;

    @Mock
    private Authentication authentication;

    private UserControllerImpl controller;

    @BeforeEach
    void setUp() {
        controller = new UserControllerImpl(currentUserResolver, getCurrentUserProfileUseCase);
    }

    @Test
    void getProfile_UsesResolvedInternalUser() {
        User user = new User();
        user.setId(9L);
        user.setUsername("alice");
        user.setEmail("alice@example.com");
        user.setFullName("Alice");
        user.setCreatedAt(OffsetDateTime.of(2026, 4, 17, 12, 0, 0, 0, ZoneOffset.UTC));
        when(currentUserResolver.resolve(authentication)).thenReturn(new CurrentUser(9L, "alice", dev.ulloasp.mlsuite.user.domain.model.SystemRole.USER));
        when(getCurrentUserProfileUseCase.getProfile(9L)).thenReturn(user);

        ResponseEntity<UserDto> response = controller.getProfile(authentication);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(9L, response.getBody().id());
        verify(getCurrentUserProfileUseCase).getProfile(9L);
    }

    @Test
    void getProfile_PropagatesMissingUser() {
        when(currentUserResolver.resolve(authentication)).thenReturn(new CurrentUser(9L, "alice", dev.ulloasp.mlsuite.user.domain.model.SystemRole.USER));
        when(getCurrentUserProfileUseCase.getProfile(9L)).thenThrow(new UserDoesNotExistException(9L));

        assertThrows(UserDoesNotExistException.class, () -> controller.getProfile(authentication));
    }
}

