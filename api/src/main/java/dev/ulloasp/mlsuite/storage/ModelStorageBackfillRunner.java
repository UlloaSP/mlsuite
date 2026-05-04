package dev.ulloasp.mlsuite.storage;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;

@Component
public class ModelStorageBackfillRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ModelStorageBackfillRunner.class);

    private final ModelRepository modelRepository;
    private final ObjectStorageService objectStorageService;
    private final StorageProperties storageProperties;

    public ModelStorageBackfillRunner(
            ModelRepository modelRepository,
            ObjectStorageService objectStorageService,
            StorageProperties storageProperties) {
        this.modelRepository = modelRepository;
        this.objectStorageService = objectStorageService;
        this.storageProperties = storageProperties;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!storageProperties.isEnabled() || !storageProperties.isBackfillOnStartup()) {
            return;
        }

        List<Model> legacyModels = modelRepository.findTop10ByStorageObjectKeyIsNullOrderByIdAsc();
        if (legacyModels.isEmpty()) {
            return;
        }

        int migrated = 0;
        int skipped = 0;
        int failed = 0;

        while (!legacyModels.isEmpty()) {
            for (Model model : legacyModels) {
                if (!model.hasInlineModelFile()) {
                    skipped++;
                    log.warn("Skipping model {} during MinIO backfill because it has no inline bytes", model.getId());
                    continue;
                }

                try {
                    byte[] inlineBytes = model.getModelFile();
                    StoredObject storedObject = objectStorageService.store(
                            buildLegacyObjectKey(model),
                            model.getFileName(),
                            "application/octet-stream",
                            inlineBytes);

                    model.setStorageBucket(storedObject.bucket());
                    model.setStorageObjectKey(storedObject.objectKey());
                    model.setStorageEtag(storedObject.etag());
                    model.setModelSizeBytes(storedObject.sizeBytes());
                    model.setModelFile(new byte[0]);
                    modelRepository.save(model);
                    migrated++;
                } catch (RuntimeException ex) {
                    failed++;
                    log.error("Failed to backfill model {} to MinIO", model.getId(), ex);
                }
            }

            legacyModels = modelRepository.findTop10ByStorageObjectKeyIsNullOrderByIdAsc();
        }

        log.info("MinIO backfill completed. migrated={}, skipped={}, failed={}", migrated, skipped, failed);
    }

    private String buildLegacyObjectKey(Model model) {
        return "legacy/users/" + model.getUser().getId() + "/models/" + model.getId() + "/"
                + sanitizePathSegment(model.getFileName() != null ? model.getFileName() : "model.bin");
    }

    private String sanitizePathSegment(String value) {
        return value
                .replaceAll("[^a-zA-Z0-9._-]", "_")
                .replaceAll("_+", "_");
    }
}

