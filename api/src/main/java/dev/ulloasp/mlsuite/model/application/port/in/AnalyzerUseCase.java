package dev.ulloasp.mlsuite.model.application.port.in;

import java.util.Map;

import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.application.dto.ExplainRequest;

public interface AnalyzerUseCase {

    Map<String, Object> inspectArtifact(Long userId, MultipartFile artifact);

    Map<String, Object> explain(Long userId, Long modelId, ExplainRequest request);
}
