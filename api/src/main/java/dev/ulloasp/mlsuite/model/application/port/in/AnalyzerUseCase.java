package dev.ulloasp.mlsuite.model.application.port.in;

import java.util.Map;

import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.application.dto.ExplainRequest;
import jakarta.annotation.Nullable;

public interface AnalyzerUseCase {

    Map<String, Object> generateInputSignature(Long userId, MultipartFile model, @Nullable MultipartFile dataframe);

    Map<String, Object> inspectArtifact(Long userId, MultipartFile artifact);

    Map<String, Object> predict(Long userId, Long modelId, Map<String, Object> data);

    Map<String, Object> explain(Long userId, Long modelId, ExplainRequest request);
}
