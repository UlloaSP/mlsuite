package dev.ulloasp.mlsuite.plugin.services;

import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.plugin.dtos.PluginDto;

public interface PluginService {

    PluginDto upload(Long userId, Long organizationId, MultipartFile file);

    default PluginDto upload(Long userId, MultipartFile file) {
        return upload(userId, userId, file);
    }

    List<PluginDto> list(Long userId, Long organizationId);

    default List<PluginDto> list(Long userId) {
        return list(userId, userId);
    }

    List<PluginDto> getActive(Long userId, Long organizationId);

    default List<PluginDto> getActive(Long userId) {
        return getActive(userId, userId);
    }

    PluginDto activate(Long userId, Long organizationId, String id);

    default PluginDto activate(Long userId, String id) {
        return activate(userId, userId, id);
    }

    void deactivate(Long userId, Long organizationId, String id);

    default void deactivate(Long userId, String id) {
        deactivate(userId, userId, id);
    }

    void deactivateAll(Long userId, Long organizationId);

    default void deactivateAll(Long userId) {
        deactivateAll(userId, userId);
    }

    void delete(Long userId, Long organizationId, String id);

    default void delete(Long userId, String id) {
        delete(userId, userId, id);
    }
}
