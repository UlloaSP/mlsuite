package dev.ulloasp.mlsuite.model.application.port.in;

import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.domain.model.Model;

public interface ModelUploadUseCase {

    /** Stores an uploaded bundle as a model of the member's organization, once the runtime read it. */
    Model createModel(Long userId, String name, MultipartFile modelFile);
}
