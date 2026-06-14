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
import dev.ulloasp.mlsuite.plugin.application.dto.PluginDto;
import dev.ulloasp.mlsuite.plugin.application.dto.PluginPageDto;
import dev.ulloasp.mlsuite.plugin.application.dto.PluginStatsDto;
import dev.ulloasp.mlsuite.plugin.application.port.in.DeletePluginUseCase;
import dev.ulloasp.mlsuite.plugin.application.port.in.GetPluginStatsUseCase;
import dev.ulloasp.mlsuite.plugin.application.port.in.ListPluginsUseCase;
import dev.ulloasp.mlsuite.plugin.application.port.in.UploadPluginUseCase;
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
    private GetPluginStatsUseCase getPluginStatsUseCase;

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
                getPluginStatsUseCase,
                deletePluginUseCase);
        dto = new PluginDto("item-1", "plugin.ts", "application/typescript", 10,
                OffsetDateTime.of(2026, 4, 17, 12, 0, 0, 0, ZoneOffset.UTC),
                OffsetDateTime.of(2026, 4, 17, 12, 0, 0, 0, ZoneOffset.UTC),
                "src", "field", "custom-field");
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
    void getAll_UsesInternalUserIdAndPagination() {
        when(currentUserResolver.resolve(authentication)).thenReturn(new CurrentUser(7L, "alice", dev.ulloasp.mlsuite.user.domain.model.SystemRole.USER));
        when(listPluginsUseCase.list(7L, 2, 5, "field", "custom", "name"))
                .thenReturn(new PluginPageDto(List.of(dto), 2, 5, 1, false));

        ResponseEntity<PluginPageDto> response = controller.getAll(authentication, 2, 5, "field", "custom", "name");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().items().size());
        verify(listPluginsUseCase).list(7L, 2, 5, "field", "custom", "name");
    }

    @Test
    void stats_UsesInternalUserId() {
        when(currentUserResolver.resolve(authentication)).thenReturn(new CurrentUser(7L, "alice", dev.ulloasp.mlsuite.user.domain.model.SystemRole.USER));
        when(getPluginStatsUseCase.stats(7L)).thenReturn(new PluginStatsDto(2, 3));

        ResponseEntity<PluginStatsDto> response = controller.stats(authentication);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(2, response.getBody().fieldPlugins());
        assertEquals(3, response.getBody().reportPlugins());
        verify(getPluginStatsUseCase).stats(7L);
    }

}

