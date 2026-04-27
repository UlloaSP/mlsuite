package dev.ulloasp.mlsuite.plugin.services;

import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.plugin.dtos.PluginDto;

public interface PluginService {

    PluginDto upload(Long userId, MultipartFile file);

    List<PluginDto> list(Long userId);

    List<PluginDto> getActive(Long userId);

    PluginDto activate(Long userId, String id);

    void deactivate(Long userId, String id);

    void deactivateAll(Long userId);

    void delete(Long userId, String id);
}
