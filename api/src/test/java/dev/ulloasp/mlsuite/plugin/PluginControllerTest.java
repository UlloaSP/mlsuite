package dev.ulloasp.mlsuite.plugin;

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

import dev.ulloasp.mlsuite.plugin.controllers.PluginControllerImpl;
import dev.ulloasp.mlsuite.plugin.dtos.PluginDto;
import dev.ulloasp.mlsuite.plugin.exceptions.PluginNotFoundException;
import dev.ulloasp.mlsuite.plugin.services.PluginService;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import jakarta.servlet.http.HttpServletRequest;

@ExtendWith(MockitoExtension.class)
class PluginControllerTest {

    @Mock
    private CurrentUserResolver currentUserResolver;

    @Mock
    private PluginService pluginService;

    @Mock
    private OAuth2AuthenticationToken authentication;

    @Mock
    private HttpServletRequest request;

    private PluginControllerImpl controller;
    private PluginDto dto;

    @BeforeEach
    void setUp() {
        controller = new PluginControllerImpl(currentUserResolver, pluginService);
        dto = new PluginDto("item-1", "plugin.ts", "application/typescript", 10,
                OffsetDateTime.of(2026, 4, 17, 12, 0, 0, 0, ZoneOffset.UTC),
                OffsetDateTime.of(2026, 4, 17, 12, 0, 0, 0, ZoneOffset.UTC), true, "src");
    }

    @Test
    void upload_UsesInternalUserId() {
        MockMultipartFile file = new MockMultipartFile("file", "plugin.ts", "application/typescript", "x".getBytes());
        when(currentUserResolver.resolve(authentication)).thenReturn(new CurrentUser(7L, "alice"));
        when(pluginService.upload(7L, file)).thenReturn(dto);

        ResponseEntity<PluginDto> response = controller.upload(authentication, file);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        verify(pluginService).upload(7L, file);
    }

    @Test
    void getAllAndActivate_UseInternalUserId() {
        when(currentUserResolver.resolve(authentication)).thenReturn(new CurrentUser(7L, "alice"));
        when(pluginService.list(7L)).thenReturn(List.of(dto));
        when(pluginService.activate(7L, "item-1")).thenReturn(dto);

        assertEquals(1, controller.getAll(authentication).getBody().size());
        assertEquals(HttpStatus.OK, controller.activate(authentication, "item-1").getStatusCode());
        verify(pluginService).activate(7L, "item-1");
    }

    @Test
    void handlePluginNotFound_ReturnsNotFound() {
        when(request.getRequestURI()).thenReturn("/api/plugins/item-1");

        ResponseEntity<?> response = controller.handlePluginNotFound(new PluginNotFoundException("item-1"), request);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }
}
