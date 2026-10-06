package dev.ulloasp.mlsuite.schema.application.service;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.schema.domain.model.BoundModel;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;

/**
 * Whether a snapshot may be public. Anyone can run a public bookmark, and every run ships each
 * bound artifact to the runtime, so each one has to fit under a size ceiling. Publishing, moving
 * a public bookmark, and public execution all ask here.
 */
@Service
public class BookmarkPublishability {

    private static final long BYTES_PER_MB = 1024L * 1024L;

    private final SchemaModelBindingRepository bindingRepository;
    private final long maxModelSizeMb;

    public BookmarkPublishability(
            SchemaModelBindingRepository bindingRepository,
            @Value("${mlsuite.public-prediction.max-model-size-mb}") long maxModelSizeMb) {
        this.bindingRepository = bindingRepository;
        this.maxModelSizeMb = maxModelSizeMb;
    }

    /** The models the snapshot runs, in binding order. */
    public List<BoundModel> models(SchemaVersion version) {
        return bindingRepository.findBoundModels(version.getId());
    }

    /**
     * Why these models keep a snapshot private, or empty when it may be public. The reason names
     * workspace models, so it is for members and server logs, never for a public response.
     */
    public Optional<String> refusal(List<BoundModel> models) {
        return models.stream().map(this::refusal).flatMap(Optional::stream).findFirst();
    }

    private Optional<String> refusal(BoundModel model) {
        if (model.sizeBytes() == null) {
            return Optional.of("Model \"%s\" has no recorded size, so it cannot be checked against the %d MB limit for public bookmarks."
                    .formatted(model.name(), maxModelSizeMb));
        }
        if (model.sizeBytes() > maxModelSizeMb * BYTES_PER_MB) {
            return Optional.of("Model \"%s\" is %s MB; public bookmarks can only run models up to %d MB."
                    .formatted(model.name(), megabytes(model.sizeBytes()), maxModelSizeMb));
        }
        return Optional.empty();
    }

    private static String megabytes(long bytes) {
        return String.format(Locale.ROOT, "%.1f", bytes / (double) BYTES_PER_MB);
    }
}
