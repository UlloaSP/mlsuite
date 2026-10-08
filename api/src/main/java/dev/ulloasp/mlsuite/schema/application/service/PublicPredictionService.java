package dev.ulloasp.mlsuite.schema.application.service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.Semaphore;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.model.adapter.out.analyzer.AnalyzerClient;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.domain.exception.AnalyzerServiceException;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.schema.application.dto.PublicPredictionDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicPredictionRequest;
import dev.ulloasp.mlsuite.schema.application.dto.PublicRunOutcome;
import dev.ulloasp.mlsuite.schema.application.dto.PublicRunQuotaDto;
import dev.ulloasp.mlsuite.schema.application.port.in.PublicPredictionUseCase;
import dev.ulloasp.mlsuite.schema.application.service.PublicPredictionPlan.ModelCall;
import dev.ulloasp.mlsuite.security.identity.PublicCaller;
import dev.ulloasp.mlsuite.storage.ModelArtifactContentReader;

/**
 * Runs a published bookmark for anyone and keeps the run as the visitor's. The visitor names
 * only the bookmark; which models run, and with which features, is decided here. This class is
 * deliberately not transactional, and its endpoint is left out of open-in-view (see
 * OpenInViewConfig): planning reads the database and returns, the runtime is called with no
 * connection held, and the run is then recorded in a transaction of its own. What went wrong
 * stays in the server log; the visitor gets a message that names no model and repeats nothing
 * the runtime said.
 */
@Service
public class PublicPredictionService implements PublicPredictionUseCase {

    private static final Logger log = LoggerFactory.getLogger(PublicPredictionService.class);

    private final PublicBookmarkService publicBookmarks;
    private final PublicRunService runs;
    private final PublicPredictionQuota quota;
    private final ModelRepository modelRepository;
    private final ModelArtifactContentReader artifactReader;
    private final AnalyzerClient analyzerClient;
    private final ObjectMapper objectMapper;
    /** The runtime is one process shared by every workspace; public runs may take only this much of it. */
    private final Semaphore runtimeSlots;

    public PublicPredictionService(
            PublicBookmarkService publicBookmarks,
            PublicRunService runs,
            PublicPredictionQuota quota,
            ModelRepository modelRepository,
            ModelArtifactContentReader artifactReader,
            AnalyzerClient analyzerClient,
            ObjectMapper objectMapper,
            @Value("${mlsuite.public-prediction.max-concurrent}") int maxConcurrent) {
        this.publicBookmarks = publicBookmarks;
        this.runs = runs;
        this.quota = quota;
        this.modelRepository = modelRepository;
        this.artifactReader = artifactReader;
        this.analyzerClient = analyzerClient;
        this.objectMapper = objectMapper;
        this.runtimeSlots = new Semaphore(maxConcurrent);
    }

    /**
     * A run is counted only after the bookmark and its values were accepted, so a missing
     * bookmark or a refused body costs the caller nothing, and before the runtime is asked, so
     * requests sent together cannot pass the limit. The caller gets the run back when the server
     * could not perform it: the runtime was busy (503) or failed (502). A run the runtime
     * answered counts, including one whose values it could not use (422).
     */
    @Override
    public PublicRunOutcome run(String publicId, PublicPredictionRequest request, PublicCaller caller) {
        PublicPredictionPlan plan = publicBookmarks.planPrediction(publicId, request);
        quota.admit(caller, publicId);
        try {
            Map<Long, Map<String, Object>> answers = perform(plan);
            PublicRunService.Recorded recorded = runs.record(plan, answers, caller);
            return new PublicRunOutcome(
                    new PublicPredictionDto(recorded.run(), quota.status(caller, publicId)),
                    recorded.issued() ? recorded.visitorId() : null);
        } catch (RuntimeException ex) {
            if (!(ex instanceof ResponseStatusException answer && answer.getStatusCode().is4xxClientError())) {
                quota.giveBack(caller, publicId);
            }
            throw ex;
        }
    }

    @Override
    public PublicRunQuotaDto quota(String publicId, PublicCaller caller) {
        publicBookmarks.requirePublic(publicId);
        return quota.status(caller, publicId);
    }

    private Map<Long, Map<String, Object>> perform(PublicPredictionPlan plan) {
        // Admission follows the cheap checks and precedes the first artifact read.
        if (!runtimeSlots.tryAcquire()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Too many public runs are in progress. Try again in a moment.");
        }
        try {
            Map<Long, Map<String, Object>> answers = new LinkedHashMap<>();
            for (ModelCall call : plan.calls()) {
                answers.put(call.modelId(), predict(plan.publicId(), call));
            }
            return answers;
        } finally {
            runtimeSlots.release();
        }
    }

    private Map<String, Object> predict(String publicId, ModelCall call) {
        try {
            Model model = modelRepository.findById(call.modelId()).orElseThrow();
            MultipartBodyBuilder parts = new MultipartBodyBuilder();
            parts.part("model_file", artifactReader.loadVerified(model))
                    .filename(model.getFileName())
                    .contentType(MediaType.APPLICATION_OCTET_STREAM);
            parts.part("data", objectMapper.writeValueAsString(call.input())).contentType(MediaType.APPLICATION_JSON);
            Map<String, Object> answer = new LinkedHashMap<>();
            analyzerClient.post("/predict", parts.build()).forEach((key, value) -> answer.put(String.valueOf(key), value));
            return answer;
        } catch (AnalyzerServiceException ex) {
            log.warn("Public bookmark {}: the runtime answered {} for model {}: {}",
                    publicId, ex.getStatus(), call.modelId(), ex.getDetail());
            if (ex.getStatus() >= 400 && ex.getStatus() < 500) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                        "The models could not use these values. Check the inputs and try again.");
            }
            throw failed();
        } catch (JsonProcessingException | RuntimeException ex) {
            log.error("Public bookmark {}: model {} could not be run", publicId, call.modelId(), ex);
            throw failed();
        }
    }

    private static ResponseStatusException failed() {
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "The prediction could not be completed. Try again later.");
    }
}
