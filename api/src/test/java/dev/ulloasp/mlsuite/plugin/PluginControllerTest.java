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

import dev.ulloasp.mlsuite.plugin.adapter.in.web.PluginController;
import dev.ulloasp.mlsuite.plugin.application.dto.PluginDto;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.plugin.application.dto.PluginStatsDto;
import dev.ulloasp.mlsuite.plugin.application.port.in.PluginCatalogUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;

@ExtendWith(MockitoExtension.class)
class PluginControllerTest {

    @Mock
    private PluginCatalogUseCase pluginCatalogUseCase;
    private CurrentUser user;

    private PluginController controller;
    private PluginDto dto;

    @BeforeEach
    void setUp() {
        controller = new PluginController(pluginCatalogUseCase);
        dto = new PluginDto("item-1", "plugin.ts", "application/typescript", 10,
                OffsetDateTime.of(2026, 4, 17, 12, 0, 0, 0, ZoneOffset.UTC),
                OffsetDateTime.of(2026, 4, 17, 12, 0, 0, 0, ZoneOffset.UTC),
                "Alice", "alice@example.com", null,
                "src", "field", "custom-field");
    }

    @Test
    void upload_UsesInternalUserId() {
        MockMultipartFile file = new MockMultipartFile("file", "plugin.ts", "application/typescript", "x".getBytes());
        user = new CurrentUser(7L, "alice", dev.ulloasp.mlsuite.user.domain.model.SystemRole.USER);
        when(pluginCatalogUseCase.upload(7L, file)).thenReturn(dto);

        ResponseEntity<PluginDto> response = controller.upload(user, file);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        verify(pluginCatalogUseCase).upload(7L, file);
    }

    @Test
    void getAll_UsesInternalUserIdAndPagination() {
        user = new CurrentUser(7L, "alice", dev.ulloasp.mlsuite.user.domain.model.SystemRole.USER);
        when(pluginCatalogUseCase.list(7L, 2, 5, "field", "custom", "name"))
                .thenReturn(new PageDto<>(List.of(dto), 2, 5, 1, false));

        ResponseEntity<PageDto<PluginDto>> response = controller.getAll(user, 2, 5, "field", "custom", "name");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().items().size());
        verify(pluginCatalogUseCase).list(7L, 2, 5, "field", "custom", "name");
    }

    @Test
    void stats_UsesInternalUserId() {
        user = new CurrentUser(7L, "alice", dev.ulloasp.mlsuite.user.domain.model.SystemRole.USER);
        when(pluginCatalogUseCase.stats(7L)).thenReturn(new PluginStatsDto(2, 3));

        ResponseEntity<PluginStatsDto> response = controller.stats(user);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(2, response.getBody().fieldPlugins());
        assertEquals(3, response.getBody().reportPlugins());
        verify(pluginCatalogUseCase).stats(7L);
    }

}

