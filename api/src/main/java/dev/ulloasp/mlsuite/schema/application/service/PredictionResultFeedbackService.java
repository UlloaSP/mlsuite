package dev.ulloasp.mlsuite.schema.application.service;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultFeedbackRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultFeedbackRevisionRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.application.dto.PredictionResultFeedbackRevisionDto;
import dev.ulloasp.mlsuite.schema.application.port.in.PredictionResultFeedbackUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedback;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedbackRevision;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewRepository;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReview;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.user.domain.model.User;
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
    private final PredictionResultFeedbackRevisionRepository revisionRepository;
    private final UserRepository userRepository;
    private final SchemaReviewRepository reviewRepository;

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

    @Override
    public List<PredictionResultFeedbackRevisionDto> historyOfResult(Long userId, Long resultId) {
        Long orgId = requireRead(userId);
        if (resultRepository.findByIdAndOrganizationId(resultId, orgId).isEmpty()) {
            throw notFound("Prediction result not found");
        }
        List<PredictionResultFeedbackRevision> revisions = revisionRepository.findByResultIdOrderByIdAsc(resultId);
        // Revisions keep ids only, so a removed member or review leaves the record intact and unnamed.
        Map<Long, String> names = userRepository.findAllById(revisions.stream()
                .flatMap(revision -> Stream.of(revision.getUserId(), revision.getChangedByUserId()))
                .filter(Objects::nonNull).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(User::getId, User::getFullName));
        Map<Long, SchemaReview> reviews = reviewRepository.findAllById(revisions.stream()
                .map(PredictionResultFeedbackRevision::getReviewId)
                .filter(Objects::nonNull).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(SchemaReview::getId, Function.identity()));
        return revisions.stream()
                .map(revision -> PredictionResultFeedbackRevisionDto.from(revision, names, reviews))
                .toList();
    }

    private Long requireRead(Long userId) {
        return authorizationService.requireCurrent(userId, PermissionKey.VIEW_MODELS).getId();
    }

    private ResponseStatusException notFound(String message) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, message);
    }
}
