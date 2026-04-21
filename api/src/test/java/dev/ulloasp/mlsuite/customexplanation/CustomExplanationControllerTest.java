package dev.ulloasp.mlsuite.customexplanation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;

import dev.ulloasp.mlsuite.customexplanation.controllers.CustomExplanationControllerImpl;
import dev.ulloasp.mlsuite.customexplanation.dtos.CustomExplanationDto;
import dev.ulloasp.mlsuite.customexplanation.services.CustomExplanationService;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;

@ExtendWith(MockitoExtension.class)
class CustomExplanationControllerTest {

    @Mock
    private CustomExplanationService customExplanationService;

    @Mock
    private OAuth2AuthenticationToken authentication;

    @Mock
    private OAuth2User oauth2User;

    @InjectMocks
    private CustomExplanationControllerImpl controller;

    private CustomExplanationDto dto;

    @BeforeEach
    void setUp() {
        when(authentication.getAuthorizedClientRegistrationId()).thenReturn("github");
        when(authentication.getPrincipal()).thenReturn(oauth2User);
        when(oauth2User.getName()).thenReturn("user-1");

        dto = new CustomExplanationDto(
                "item-1",
                "explain.ts",
                "application/typescript",
                100,
                OffsetDateTime.of(2026, 4, 17, 12, 0, 0, 0, ZoneOffset.UTC),
                OffsetDateTime.of(2026, 4, 17, 12, 0, 0, 0, ZoneOffset.UTC),
                true,
                "export default defineExplanationKind({ kind: 'x', schema: z.object({ kind: z.literal('x') }), fetch: () => ({ submit: async () => null }), render: { content: () => ({ type: 'json', value: null }) } })");
    }

    @Test
    void upload_ReturnsCreated() {
        MockMultipartFile file = new MockMultipartFile("file", "explain.ts", "application/typescript", "x".getBytes());
        when(customExplanationService.upload(eq(OAuthProvider.GITHUB), eq("user-1"), eq(file))).thenReturn(dto);

        ResponseEntity<CustomExplanationDto> response = controller.upload(authentication, file);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("item-1", response.getBody().id());
        verify(customExplanationService).upload(eq(OAuthProvider.GITHUB), eq("user-1"), eq(file));
    }

    @Test
    void getAllAndActive_ReturnOk() {
        when(customExplanationService.list(eq(OAuthProvider.GITHUB), eq("user-1"))).thenReturn(List.of(dto));
        when(customExplanationService.getActive(eq(OAuthProvider.GITHUB), eq("user-1"))).thenReturn(List.of(dto));

        ResponseEntity<List<CustomExplanationDto>> allResponse = controller.getAll(authentication);
        ResponseEntity<List<CustomExplanationDto>> activeResponse = controller.getActive(authentication);

        assertEquals(HttpStatus.OK, allResponse.getStatusCode());
        assertEquals(1, allResponse.getBody().size());
        assertEquals(HttpStatus.OK, activeResponse.getStatusCode());
        assertEquals(1, activeResponse.getBody().size());
    }

    @Test
    void activateDeactivateAndDelete_DelegateToService() {
        when(customExplanationService.activate(eq(OAuthProvider.GITHUB), eq("user-1"), eq("item-1"))).thenReturn(dto);

        ResponseEntity<CustomExplanationDto> activateResponse = controller.activate(authentication, "item-1");
        ResponseEntity<Void> deactivateResponse = controller.deactivate(authentication, "item-1");
        ResponseEntity<Void> deactivateAllResponse = controller.deactivateAll(authentication);
        ResponseEntity<Void> deleteResponse = controller.delete(authentication, "item-1");

        assertEquals(HttpStatus.OK, activateResponse.getStatusCode());
        assertEquals(HttpStatus.NO_CONTENT, deactivateResponse.getStatusCode());
        assertEquals(HttpStatus.NO_CONTENT, deactivateAllResponse.getStatusCode());
        assertEquals(HttpStatus.NO_CONTENT, deleteResponse.getStatusCode());
        verify(customExplanationService).activate(eq(OAuthProvider.GITHUB), eq("user-1"), eq("item-1"));
        verify(customExplanationService).deactivate(eq(OAuthProvider.GITHUB), eq("user-1"), eq("item-1"));
        verify(customExplanationService).deactivateAll(eq(OAuthProvider.GITHUB), eq("user-1"));
        verify(customExplanationService).delete(eq(OAuthProvider.GITHUB), eq("user-1"), eq("item-1"));
    }
}
