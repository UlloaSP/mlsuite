package dev.ulloasp.mlsuite.schema.application.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultFeedbackRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.application.port.in.PredictionResultFeedbackUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedback;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@Transactional
@RequiredArgsConstructor
public class PredictionResultFeedbackService implements PredictionResultFeedbackUseCase {

    private final WorkspaceAuthorizationService authorizationService;
    private final PredictionResultRepository resultRepository;
    private final PredictionResultFeedbackRepository feedbackRepository;
    private final PredictionRunRepository runRepository;

    @Override
    public List<PredictionResultFeedback> listByResult(Long userId, Long resultId) {
        Long orgId = requireRead(userId);
        if (resultRepository.findByIdAndOrganizationId(resultId, orgId).isEmpty()) {
            throw notFound("Prediction result not found");
        }
        return feedbackRepository.findByResultIdAndOrganizationId(resultId, orgId);
    }

    @Override
    public List<PredictionResultFeedback> listByRuns(Long userId, List<Long> runIds) {
        Long orgId = requireRead(userId);
        if (runIds == null || runIds.isEmpty() || runIds.size() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "runIds must contain 1 to 100 ids");
        }
        List<Long> uniqueRunIds = runIds.stream().distinct().toList();
        if (runRepository.countByIdsAndOrganizationId(uniqueRunIds, orgId) != uniqueRunIds.size()) {
            throw notFound("Prediction run not found");
        }
        return feedbackRepository.findByRunIdsAndOrganizationId(uniqueRunIds, orgId);
    }

    private Long requireRead(Long userId) {
        return authorizationService.requireCurrent(userId, PermissionKey.VIEW_MODELS).getId();
    }

    private ResponseStatusException notFound(String message) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, message);
    }
}
