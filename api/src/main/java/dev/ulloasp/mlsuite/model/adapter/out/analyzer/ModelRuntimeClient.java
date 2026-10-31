package dev.ulloasp.mlsuite.model.adapter.out.analyzer;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.AbstractResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.model.application.runtime.ModelPreparationLedger;
import dev.ulloasp.mlsuite.model.application.runtime.ModelPreparingException;
import dev.ulloasp.mlsuite.model.application.runtime.ModelUnavailableException;
import dev.ulloasp.mlsuite.model.application.runtime.RunnableModel;
import dev.ulloasp.mlsuite.model.domain.exception.AnalyzerServiceException;
import dev.ulloasp.mlsuite.storage.ArtifactSource;
import dev.ulloasp.mlsuite.storage.ModelArtifactContentReader;
import dev.ulloasp.mlsuite.storage.ModelArtifactReference;
import lombok.RequiredArgsConstructor;

/**
 * Runs a model on the runtime, which keeps the bundles it verified by SHA-256. A run names the
 * artifact by its persisted SHA-256 alone, and the environment the model runs in. Only when the
 * runtime answers {@value #ARTIFACT_NOT_LOADED}, because it does not hold that artifact, is the
 * verified artifact read and sent, under the same SHA-256, which the runtime checks against the
 * bytes. A model that is not READY never reaches the runtime; one whose environment the runtime
 * no longer has ({@value #ENVIRONMENT_NOT_READY}) is prepared again.
 */
@Component
@RequiredArgsConstructor
public class ModelRuntimeClient {

    /** The runtime's answer to a run naming an artifact it does not hold. */
    static final int ARTIFACT_NOT_LOADED = 409;
    /** The runtime's answer to a run naming an environment it has not built. */
    public static final int ENVIRONMENT_NOT_READY = 424;

    private static final Logger log = LoggerFactory.getLogger(ModelRuntimeClient.class);

    private final AnalyzerClient analyzerClient;
    private final ModelArtifactContentReader artifactReader;
    private final ModelPreparationLedger preparations;

    /**
     * Posts the run's JSON form fields to {@code path} for a READY model. Every other failure of
     * the runtime is thrown as its {@link AnalyzerServiceException}.
     */
    public Map<String, Object> run(String path, RunnableModel model, Map<String, String> jsonFields) {
        switch (model.state()) {
            case PREPARING -> throw new ModelPreparingException();
            case FAILED -> throw new ModelUnavailableException();
            case READY -> { }
        }
        try {
            return send(path, model, jsonFields);
        } catch (AnalyzerServiceException ex) {
            if (ex.getStatus() != ENVIRONMENT_NOT_READY) throw ex;
            log.warn("The runtime lacks the environment of model {}; preparing it again", model.modelId());
            preparations.prepareAgain(model.modelId());
            throw new ModelPreparingException();
        }
    }

    /** Loads the model in its environment on the runtime, whatever its state: how it is prepared. */
    public Map<String, Object> verify(RunnableModel model) {
        return send("/verify", model, Map.of());
    }

    private Map<String, Object> send(String path, RunnableModel model, Map<String, String> jsonFields) {
        ModelArtifactReference artifact = model.artifact();
        try {
            return analyzerClient.post(path, parts(artifact.sha256(), model, jsonFields).build());
        } catch (AnalyzerServiceException ex) {
            if (ex.getStatus() != ARTIFACT_NOT_LOADED) throw ex;
            log.info("The runtime does not hold the artifact of model {}; sending it", artifact.modelId());
        }
        ArtifactSource source = artifactReader.source(artifact);
        MultipartBodyBuilder parts = parts(artifact.sha256(), model, jsonFields);
        parts.part("model_file", new StreamedArtifact(source, artifact.fileName()))
                .filename(artifact.fileName())
                .contentType(MediaType.APPLICATION_OCTET_STREAM);
        return analyzerClient.postWithArtifact(path, parts.build());
    }

    /**
     * The artifact as a multipart body part, streamed into the request: its length is known, so
     * nothing reads the stream to measure it first.
     */
    private static final class StreamedArtifact extends AbstractResource {
        private final ArtifactSource source;
        private final String fileName;

        StreamedArtifact(ArtifactSource source, String fileName) {
            this.source = source;
            this.fileName = fileName;
        }

        @Override
        public InputStream getInputStream() throws IOException {
            return source.open();
        }

        @Override
        public long contentLength() {
            return source.sizeBytes();
        }

        @Override
        public String getFilename() {
            return fileName;
        }

        @Override
        public String getDescription() {
            return "artifact " + fileName;
        }
    }

    private static MultipartBodyBuilder parts(String sha256, RunnableModel model, Map<String, String> jsonFields) {
        MultipartBodyBuilder parts = new MultipartBodyBuilder();
        parts.part("artifact_sha256", sha256);
        parts.part("environment", model.environmentKey());
        jsonFields.forEach((name, json) -> parts.part(name, json).contentType(MediaType.APPLICATION_JSON));
        return parts;
    }
}
