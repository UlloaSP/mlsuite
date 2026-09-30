package dev.ulloasp.mlsuite.plugin.application.port.in;

import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.plugin.application.dto.PluginDto;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.plugin.application.dto.PluginStatsDto;

public interface PluginCatalogUseCase {

    PluginDto upload(Long userId, MultipartFile file);

    PageDto<PluginDto> list(Long userId, int page, int size, String type, String search, String sort);

    PluginStatsDto stats(Long userId);

    void delete(Long userId, String id);
}
