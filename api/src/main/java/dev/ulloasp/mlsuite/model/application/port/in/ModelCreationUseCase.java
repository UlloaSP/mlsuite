package dev.ulloasp.mlsuite.model.application.port.in;

import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.application.dto.CreateModelDto;
import jakarta.annotation.Nullable;

public interface ModelCreationUseCase {

    CreateModelDto create(
            Long userId,
            String name,
            MultipartFile modelFile,
            @Nullable MultipartFile dataframeFile,
            String oneHotSeparator);
}
