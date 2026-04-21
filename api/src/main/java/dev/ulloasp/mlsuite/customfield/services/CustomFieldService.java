package dev.ulloasp.mlsuite.customfield.services;

import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.customfield.dtos.CustomFieldDto;

public interface CustomFieldService {

    CustomFieldDto upload(Long userId, MultipartFile file);

    List<CustomFieldDto> list(Long userId);

    List<CustomFieldDto> getActive(Long userId);

    CustomFieldDto activate(Long userId, String id);

    void deactivate(Long userId, String id);

    void deactivateAll(Long userId);

    void delete(Long userId, String id);
}
