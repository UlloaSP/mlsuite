package dev.ulloasp.mlsuite.apiaccess.application.service;

import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiPredictionDto;
import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiPredictionRequest;
import dev.ulloasp.mlsuite.apiaccess.application.port.in.ApiPredictionUseCase;
import dev.ulloasp.mlsuite.apiaccess.domain.exception.ApiErrorCode;
import dev.ulloasp.mlsuite.apiaccess.domain.exception.ApiProblem;
import dev.ulloasp.mlsuite.apiaccess.domain.model.ApiCaller;
import dev.ulloasp.mlsuite.model.application.runtime.ModelPreparingException;
import dev.ulloasp.mlsuite.model.application.runtime.ModelUnavailableException;
import dev.ulloasp.mlsuite.model.domain.exception.AnalyzerServiceException;
import dev.ulloasp.mlsuite.schema.application.service.PublicModelRuntime;
import dev.ulloasp.mlsuite.schema.application.service.RuntimeSlots;
import lombok.RequiredArgsConstructor;

/**
 * Runs a bookmark for an API client. The client's record goes to the runtime as sent, under the
 * model's own feature names: the runtime alone checks it against the model. Like the public
 * runs, nothing here is transactional and the endpoint is left out of open-in-view, so no
 * connection is held while the runtime works.
 *
 * <p>Every call made with a valid key is logged under the id it is answered with, whatever its
 * outcome; a call without one belongs to no organization and is not. A record the runtime
 * refused is answered with the runtime's own words, which only a key holder reads.
 */
@Service
@RequiredArgsConstructor
public class ApiPredictionService implements ApiPredictionUseCase {

    private static final Logger log = LoggerFactory.getLogger(ApiPredictionService.class);

    private final ApiRunService runs;
    private final ApiCallLimits limits;
    private final ApiRuntimeSlots slots;
    private final PublicModelRuntime runtime;
    private final ApiRequestLog requestLog;

    @Override
    public ApiPredictionDto predict(String secret, String bookmarkId, ApiPredictionRequest request) {
        UUID requestId = UUID.randomUUID();
        long started = System.nanoTime();
        ApiCaller caller = runs.authenticate(secret);
        ApiTarget target = null;
        try {
            if (caller.suspended()) {
                throw new ApiProblem(ApiErrorCode.CLIENT_SUSPENDED,
                        "The platform suspended this client. Its organization can see why.");
            }
            try (RuntimeSlots.Admission admission = slots.admit(caller.clientId())) {
                limits.admit(caller);
                target = runs.target(caller, bookmarkId);
                ApiRunPlan plan = runs.plan(caller, target, request.features());
                Map<String, Object> answer = admission.run(() -> perform(plan));
                // A reply that gives no outputs is a failed run: it is neither answered nor kept.
                ApiOutputs.Read read = ApiOutputs.of(answer);
                if (read.malformed() != null) {
                    log.error("API client {}: the runtime's reply for model {} is malformed: {}",
                            caller.clientId(), plan.modelId(), read.malformed());
                    throw failed();
                }
                Long runId = runs.record(plan, answer);
                logCall(requestId, caller, target, runId, 200, null, started);
                return new ApiPredictionDto(requestId,
                        new ApiPredictionDto.ApiPredictionBookmark(target.apiId(), target.name()),
                        new ApiPredictionDto.ApiPredictionSnapshot(plan.version(), plan.versionName()),
                        new ApiPredictionDto.ApiPredictionModel(plan.modelName(), plan.modelSha256()),
                        read.outputs());
            }
        } catch (ApiProblem problem) {
            logCall(requestId, caller, target, null, problem.code().status().value(), problem.code().code(), started);
            throw problem.forRequest(requestId);
        } catch (RuntimeException unexpected) {
            log.error("API client {}: call {} failed", caller.clientId(), requestId, unexpected);
            logCall(requestId, caller, target, null, 500, ApiErrorCode.INTERNAL_ERROR.code(), started);
            throw new ApiProblem(ApiErrorCode.INTERNAL_ERROR, "The call could not be completed.")
                    .forRequest(requestId);
        }
    }

    private Map<String, Object> perform(ApiRunPlan plan) {
        try {
            return runtime.predict("API client " + plan.caller().clientId(), plan.modelId(), plan.features());
        } catch (ModelPreparingException preparing) {
            throw new ApiProblem(ApiErrorCode.RUNTIME_BUSY, "The model is being prepared. Try again shortly.");
        } catch (ModelUnavailableException unavailable) {
            throw new ApiProblem(ApiErrorCode.BOOKMARK_NOT_RUNNABLE, "The model cannot run: its environment could not be prepared.");
        } catch (AnalyzerServiceException refused) {
            String detail = refused.getDetail() == null || refused.getDetail().isBlank() ? "" : ": " + refused.getDetail();
            throw new ApiProblem(ApiErrorCode.FEATURES_REJECTED, "The model could not use these features" + detail);
        } catch (ResponseStatusException failure) {
            throw failed();
        }
    }

    /** The log is the metering, but a call that ran is still answered when it cannot be written. */
    private void logCall(UUID requestId, ApiCaller caller, ApiTarget target, Long runId, int status, String code,
            long started) {
        int durationMs = (int) Math.min(Integer.MAX_VALUE, (System.nanoTime() - started) / 1_000_000);
        try {
            requestLog.record(requestId, caller, target, runId, status, code, durationMs);
        } catch (RuntimeException failure) {
            log.error("API call {} of client {} could not be logged", requestId, caller.clientId(), failure);
        }
    }

    private static ApiProblem failed() {
        return new ApiProblem(ApiErrorCode.RUNTIME_FAILED, "The prediction could not be completed. Try again later.");
    }
}
