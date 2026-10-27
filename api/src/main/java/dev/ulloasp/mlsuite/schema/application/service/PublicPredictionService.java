package dev.ulloasp.mlsuite.schema.application.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.model.domain.exception.AnalyzerServiceException;
import dev.ulloasp.mlsuite.schema.application.dto.PublicPredictionDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicPredictionRequest;
import dev.ulloasp.mlsuite.schema.application.dto.PublicRunOutcome;
import dev.ulloasp.mlsuite.schema.application.dto.PublicRunQuotaDto;
import dev.ulloasp.mlsuite.schema.application.port.in.PublicPredictionUseCase;
import dev.ulloasp.mlsuite.schema.application.service.PublicPredictionPlan.ModelCall;
import dev.ulloasp.mlsuite.security.identity.PublicCaller;
import lombok.RequiredArgsConstructor;

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
@RequiredArgsConstructor
public class PublicPredictionService implements PublicPredictionUseCase {

    private final PublicBookmarkService publicBookmarks;
    private final PublicRunService runs;
    private final PublicPredictionQuota quota;
    private final PublicRuntimeSlots slots;
    private final PublicModelRuntime runtime;

    /**
     * A run first takes its caller's place in the public share's queue, before any database work.
     * A run is counted only after the bookmark and its values were accepted, so a missing
     * bookmark or a refused body costs the caller nothing, and before the runtime is asked, so
     * requests sent together cannot pass the limit. The caller gets the run back when the server
     * could not perform it: the runtime was busy (503) or failed (502). A run the runtime
     * answered counts, including one whose values it could not use (422).
     */
    @Override
    public PublicRunOutcome run(String publicId, PublicPredictionRequest request, PublicCaller caller) {
        try (RuntimeSlots.Admission admission = slots.admit(caller.key())) {
            PublicPredictionPlan plan = publicBookmarks.planPrediction(publicId, request);
            quota.admit(caller, publicId);
            try {
                Map<Long, Map<String, Object>> answers = admission.run(() -> perform(plan));
                PublicRunService.Recorded recorded = runs.record(plan, answers, caller);
                runs.markSeen(recorded);
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
    }

    @Override
    public PublicRunQuotaDto quota(String publicId, PublicCaller caller) {
        publicBookmarks.requirePublic(publicId);
        return quota.status(caller, publicId);
    }

    private Map<Long, Map<String, Object>> perform(PublicPredictionPlan plan) {
        String caller = "Public bookmark " + plan.publicId();
        Map<Long, Map<String, Object>> answers = new LinkedHashMap<>();
        for (ModelCall call : plan.calls()) {
            Map<String, Object> answer = predict(caller, call);
            // A visitor's browser asks for no explanation, as a workspace form does: the same run produces it.
            if (plan.reports().stream().anyMatch(route -> route.modelId().equals(call.modelId()) && !route.assessed())) {
                answer.put("reports", withExplanation(answer.get("reports"),
                        runtime.explain(caller, call.modelId(), call.input())));
            }
            answers.put(call.modelId(), answer);
        }
        return answers;
    }

    private Map<String, Object> predict(String caller, ModelCall call) {
        try {
            return runtime.predict(caller, call.modelId(), call.input());
        } catch (AnalyzerServiceException refused) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "The models could not use these values. Check the inputs and try again.");
        }
    }

    private static List<Object> withExplanation(Object predicted, List<?> explained) {
        List<Object> reports = new ArrayList<>(predicted instanceof List<?> items ? items : List.of());
        reports.addAll(explained);
        return reports;
    }
}
