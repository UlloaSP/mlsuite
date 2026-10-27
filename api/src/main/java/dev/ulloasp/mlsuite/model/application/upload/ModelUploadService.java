package dev.ulloasp.mlsuite.model.application.upload;

import java.io.IOException;

import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.adapter.out.analyzer.AnalyzerClient;
import dev.ulloasp.mlsuite.model.application.port.in.ModelCatalogUseCase;
import dev.ulloasp.mlsuite.model.application.port.in.ModelUploadUseCase;
import dev.ulloasp.mlsuite.model.application.service.WorkspaceRuntimeSlots;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.schema.application.service.RuntimeSlots;
import lombok.RequiredArgsConstructor;

/**
 * Turns an uploaded bundle into a model, sent once by the browser. Nothing here is transactional
 * and its endpoint is left out of open-in-view (see OpenInViewConfig), so no connection is held
 * while the runtime reads the bundle, which can take far longer than a prediction: the member's
 * right to create it is checked in a short read, the runtime reads the bundle in a slot of the
 * workspace share, streamed from the upload's temporary file, and the model is then stored in a
 * transaction of its own. The bundle is read into memory once, for the database's copy and the
 * object store.
 */
@Service
@RequiredArgsConstructor
public class ModelUploadService implements ModelUploadUseCase {

    private final ModelCatalogUseCase catalog;
    private final AnalyzerClient analyzerClient;
    private final WorkspaceRuntimeSlots slots;

    @Override
    public Model createModel(Long userId, String name, MultipartFile modelFile) {
        try (RuntimeSlots.Admission admission = slots.admit(userId)) {
            catalog.requireCreatable(userId, name);
            BundleInspection inspection = admission.run(() -> inspect(modelFile));
            return catalog.createModel(userId, name, inspection, read(modelFile), modelFile.getContentType());
        }
    }

    private BundleInspection inspect(MultipartFile modelFile) {
        LinkedMultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("model_file", modelFile.getResource());
        return BundleInspection.of(analyzerClient.inspect(body), modelFile.getOriginalFilename());
    }

    private static byte[] read(MultipartFile modelFile) {
        try {
            return modelFile.getBytes();
        } catch (IOException ex) {
            throw new IllegalArgumentException("Model file is empty or invalid", ex);
        }
    }
}
