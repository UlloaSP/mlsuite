package dev.ulloasp.mlsuite.plugin.application.port.in;

import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.plugin.application.dto.PluginDto;

public interface UploadPluginUseCase {

    PluginDto upload(Long userId, MultipartFile file);
}
