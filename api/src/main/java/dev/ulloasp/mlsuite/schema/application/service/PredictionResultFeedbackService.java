package dev.ulloasp.mlsuite.schema.application.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultFeedbackRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultRepository;
import dev.ulloasp.mlsuite.schema.application.dto.CreatePredictionResultFeedbackRequest;
import dev.ulloasp.mlsuite.schema.application.dto.UpdatePredictionResultFeedbackRequest;
import dev.ulloasp.mlsuite.schema.application.port.in.PredictionResultFeedbackUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResult;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedback;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import jakarta.transaction.Transactional;

@Service
@Transactional
public class PredictionResultFeedbackService implements PredictionResultFeedbackUseCase {

    private final UserLookupService userLookupService;
    private final WorkspaceAccessService workspaceAccessService;
    private final WorkspaceAuthorizationService authorizationService;
    private final PredictionResultRepository resultRepository;
    private final PredictionResultFeedbackRepository feedbackRepository;

    public PredictionResultFeedbackService(UserLookupService userLookupService,
            WorkspaceAccessService workspaceAccessService, WorkspaceAuthorizationService authorizationService,
            PredictionResultRepository resultRepository, PredictionResultFeedbackRepository feedbackRepository) {
        this.userLookupService = userLookupService;
        this.workspaceAccessService = workspaceAccessService;
        this.authorizationService = authorizationService;
        this.resultRepository = resultRepository;
        this.feedbackRepository = feedbackRepository;
    }

    @Override
    public PredictionResultFeedback create(Long userId, CreatePredictionResultFeedbackRequest request) {
        User user = userLookupService.requireById(userId);
        Long orgId = requireOrg(userId);
        PredictionResult result = resultRepository.findByIdAndOrganizationId(request.resultId(), orgId)
                .orElseThrow(() -> notFound("Prediction result not found"));
        PredictionResultFeedback feedback = feedbackRepository
                .findByResultIdAndUserIdAndTypeAndOrder(request.resultId(), userId, request.type(), request.order())
                .orElseGet(() -> new PredictionResultFeedback(result, user, request.type(), request.order(), request.value()));
        feedback.setValue(request.value());
        return feedbackRepository.save(feedback);
    }

    @Override
    public PredictionResultFeedback update(Long userId, UpdatePredictionResultFeedbackRequest request) {
        userLookupService.requireById(userId);
        Long orgId = requireOrg(userId);
        PredictionResultFeedback feedback = feedbackRepository.findByIdAndOrganizationId(request.feedbackId(), orgId)
                .orElseThrow(() -> notFound("Prediction result feedback not found"));
        feedback.setValue(request.value());
        return feedbackRepository.save(feedback);
    }

    @Override
    public List<PredictionResultFeedback> listByResult(Long userId, Long resultId) {
        userLookupService.requireById(userId);
        Long orgId = requireOrg(userId);
        if (resultRepository.findByIdAndOrganizationId(resultId, orgId).isEmpty()) {
            throw notFound("Prediction result not found");
        }
        return feedbackRepository.findByResultIdAndOrganizationId(resultId, orgId);
    }

    private Long requireOrg(Long userId) {
        Long orgId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        authorizationService.requireOrganizationRead(userId, orgId);
        return orgId;
    }

    private ResponseStatusException notFound(String message) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, message);
    }
}
