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
import org.springframework.security.core.Authentication;

import dev.ulloasp.mlsuite.plugin.adapter.in.web.PluginControllerImpl;
import dev.ulloasp.mlsuite.plugin.application.port.in.ActivatePluginUseCase;
import dev.ulloasp.mlsuite.plugin.application.port.in.DeactivateAllPluginsUseCase;
import dev.ulloasp.mlsuite.plugin.application.port.in.DeactivatePluginUseCase;
import dev.ulloasp.mlsuite.plugin.application.port.in.DeletePluginUseCase;
import dev.ulloasp.mlsuite.plugin.application.port.in.ListActivePluginsUseCase;
import dev.ulloasp.mlsuite.plugin.application.port.in.ListPluginsUseCase;
import dev.ulloasp.mlsuite.plugin.application.port.in.UploadPluginUseCase;
import dev.ulloasp.mlsuite.plugin.application.dto.PluginDto;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;

@ExtendWith(MockitoExtension.class)
class PluginControllerTest {

    @Mock
    private CurrentUserResolver currentUserResolver;

    @Mock
    private UploadPluginUseCase uploadPluginUseCase;

    @Mock
    private ListPluginsUseCase listPluginsUseCase;

    @Mock
    private ListActivePluginsUseCase listActivePluginsUseCase;

    @Mock
    private ActivatePluginUseCase activatePluginUseCase;

    @Mock
    private DeactivatePluginUseCase deactivatePluginUseCase;

    @Mock
    private DeactivateAllPluginsUseCase deactivateAllPluginsUseCase;

    @Mock
    private DeletePluginUseCase deletePluginUseCase;

    @Mock
    private Authentication authentication;

    private PluginControllerImpl controller;
    private PluginDto dto;

    @BeforeEach
    void setUp() {
        controller = new PluginControllerImpl(
                currentUserResolver,
                uploadPluginUseCase,
                listPluginsUseCase,
                listActivePluginsUseCase,
                activatePluginUseCase,
                deactivatePluginUseCase,
                deactivateAllPluginsUseCase,
                deletePluginUseCase);
        dto = new PluginDto("item-1", "plugin.ts", "application/typescript", 10,
                OffsetDateTime.of(2026, 4, 17, 12, 0, 0, 0, ZoneOffset.UTC),
                OffsetDateTime.of(2026, 4, 17, 12, 0, 0, 0, ZoneOffset.UTC), true, "src");
    }

    @Test
    void upload_UsesInternalUserId() {
        MockMultipartFile file = new MockMultipartFile("file", "plugin.ts", "application/typescript", "x".getBytes());
        when(currentUserResolver.resolve(authentication)).thenReturn(new CurrentUser(7L, "alice", dev.ulloasp.mlsuite.user.domain.model.SystemRole.USER));
        when(uploadPluginUseCase.upload(7L, file)).thenReturn(dto);

        ResponseEntity<PluginDto> response = controller.upload(authentication, file);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        verify(uploadPluginUseCase).upload(7L, file);
    }

    @Test
    void getAllAndActivate_UseInternalUserId() {
        when(currentUserResolver.resolve(authentication)).thenReturn(new CurrentUser(7L, "alice", dev.ulloasp.mlsuite.user.domain.model.SystemRole.USER));
        when(listPluginsUseCase.list(7L)).thenReturn(List.of(dto));
        when(activatePluginUseCase.activate(7L, "item-1")).thenReturn(dto);

        assertEquals(1, controller.getAll(authentication).getBody().size());
        assertEquals(HttpStatus.OK, controller.activate(authentication, "item-1").getStatusCode());
        verify(activatePluginUseCase).activate(7L, "item-1");
    }

}

