package dev.ulloasp.mlsuite.model.adapter.out.analyzer;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.model.domain.exception.AnalyzerServiceException;
import dev.ulloasp.mlsuite.storage.ArtifactHash;
import dev.ulloasp.mlsuite.storage.ModelArtifactContentReader;
import dev.ulloasp.mlsuite.storage.ModelArtifactReference;
import lombok.RequiredArgsConstructor;

/**
 * Runs a model on the runtime, which keeps the bundles it verified by SHA-256. A run names the
 * artifact by its persisted SHA-256 alone. Only when the runtime answers
 * {@value #ARTIFACT_NOT_LOADED}, because it does not hold that artifact, is the verified artifact
 * read and sent, under the same SHA-256, which the runtime checks against the bytes.
 */
@Component
@RequiredArgsConstructor
public class ModelRuntimeClient {

    /** The runtime's answer to a run naming an artifact it does not hold. */
    static final int ARTIFACT_NOT_LOADED = 409;

    private static final Logger log = LoggerFactory.getLogger(ModelRuntimeClient.class);

    private final AnalyzerClient analyzerClient;
    private final ModelArtifactContentReader artifactReader;

    /**
     * Posts the run's JSON form fields to {@code path} for the artifact. Every other failure of
     * the runtime is thrown as its {@link AnalyzerServiceException}.
     */
    public Map<String, Object> run(String path, ModelArtifactReference artifact, Map<String, String> jsonFields) {
        if (artifact.sha256() != null) {
            try {
                return analyzerClient.post(path, parts(artifact.sha256(), jsonFields).build());
            } catch (AnalyzerServiceException ex) {
                if (ex.getStatus() != ARTIFACT_NOT_LOADED) throw ex;
                log.info("The runtime does not hold the artifact of model {}; sending it", artifact.modelId());
            }
        }
        byte[] bytes = artifactReader.loadVerified(artifact);
        // A model stored before artifacts were hashed is named by the hash of its verified bytes.
        String sha256 = artifact.sha256() != null ? artifact.sha256() : ArtifactHash.sha256(bytes);
        MultipartBodyBuilder parts = parts(sha256, jsonFields);
        parts.part("model_file", bytes)
                .filename(artifact.fileName())
                .contentType(MediaType.APPLICATION_OCTET_STREAM);
        return analyzerClient.post(path, parts.build());
    }

    private static MultipartBodyBuilder parts(String sha256, Map<String, String> jsonFields) {
        MultipartBodyBuilder parts = new MultipartBodyBuilder();
        parts.part("artifact_sha256", sha256);
        jsonFields.forEach((name, json) -> parts.part(name, json).contentType(MediaType.APPLICATION_JSON));
        return parts;
    }
}
