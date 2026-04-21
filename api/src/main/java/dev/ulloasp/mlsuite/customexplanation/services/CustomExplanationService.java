package dev.ulloasp.mlsuite.customexplanation.services;

import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.customexplanation.dtos.CustomExplanationDto;

public interface CustomExplanationService {

    CustomExplanationDto upload(Long userId, MultipartFile file);

    List<CustomExplanationDto> list(Long userId);

    List<CustomExplanationDto> getActive(Long userId);

    CustomExplanationDto activate(Long userId, String id);

    void deactivate(Long userId, String id);

    void deactivateAll(Long userId);

    void delete(Long userId, String id);
}
