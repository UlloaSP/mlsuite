package dev.ulloasp.mlsuite.customexplanation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;

import dev.ulloasp.mlsuite.customexplanation.controllers.CustomExplanationControllerImpl;
import dev.ulloasp.mlsuite.customexplanation.dtos.CustomExplanationDto;
import dev.ulloasp.mlsuite.customexplanation.exceptions.CustomExplanationNotFoundException;
import dev.ulloasp.mlsuite.customexplanation.services.CustomExplanationService;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import jakarta.servlet.http.HttpServletRequest;

@ExtendWith(MockitoExtension.class)
class CustomExplanationControllerTest {

    @Mock
    private CurrentUserResolver currentUserResolver;

    @Mock
    private CustomExplanationService customExplanationService;

    @Mock
    private OAuth2AuthenticationToken authentication;

    @Mock
    private HttpServletRequest request;

    private CustomExplanationControllerImpl controller;
    private CustomExplanationDto dto;
    private CurrentUser currentUser;

    @BeforeEach
    void setUp() {
        controller = new CustomExplanationControllerImpl(currentUserResolver, customExplanationService);
        currentUser = new CurrentUser(7L, "alice");
        dto = new CustomExplanationDto("item-1", "explain.ts", "application/typescript", 10,
                OffsetDateTime.of(2026, 4, 17, 12, 0, 0, 0, ZoneOffset.UTC),
                OffsetDateTime.of(2026, 4, 17, 12, 0, 0, 0, ZoneOffset.UTC), true, "src");
    }

    @Test
    void upload_UsesInternalUserId() {
        MockMultipartFile file = new MockMultipartFile("file", "explain.ts", "application/typescript", "x".getBytes());
        when(currentUserResolver.resolve(authentication)).thenReturn(currentUser);
        when(customExplanationService.upload(7L, file)).thenReturn(dto);

        ResponseEntity<CustomExplanationDto> response = controller.upload(authentication, file);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        verify(customExplanationService).upload(7L, file);
    }

    @Test
    void getAllAndActivate_UseInternalUserId() {
        when(currentUserResolver.resolve(authentication)).thenReturn(currentUser);
        when(customExplanationService.list(7L)).thenReturn(List.of(dto));
        when(customExplanationService.activate(7L, "item-1")).thenReturn(dto);

        assertEquals(1, controller.getAll(authentication).getBody().size());
        assertEquals(HttpStatus.OK, controller.activate(authentication, "item-1").getStatusCode());
        verify(customExplanationService).activate(7L, "item-1");
    }

    @Test
    void handleCustomExplanationNotFound_ReturnsNotFound() {
        when(request.getRequestURI()).thenReturn("/api/custom-explanations/item-1");

        ResponseEntity<?> response = controller.handleCustomExplanationNotFound(
                new CustomExplanationNotFoundException("item-1"), request);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }
}
