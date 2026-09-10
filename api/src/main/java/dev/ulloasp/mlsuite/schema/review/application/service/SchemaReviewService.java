package dev.ulloasp.mlsuite.schema.review.application.service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultFeedbackRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaVersionRepository;
import dev.ulloasp.mlsuite.schema.application.dto.CreatePredictionResultFeedbackRequest;
import dev.ulloasp.mlsuite.schema.application.dto.PredictionResultFeedbackDto;
import dev.ulloasp.mlsuite.schema.application.dto.PredictionRunDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaVersionDto;
import dev.ulloasp.mlsuite.schema.application.dto.UpdatePredictionResultFeedbackRequest;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResult;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedback;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewRepository;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewRunRepository;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewRunSubmissionRepository;
import dev.ulloasp.mlsuite.schema.review.application.dto.CreateSchemaReviewRequest;
import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewContextDto;
import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewRunDetailDto;
import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewRunListItemDto;
import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewReviewerDto;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReview;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewRun;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewRunSubmission;
import dev.ulloasp.mlsuite.schema.review.application.port.in.SchemaReviewUseCase;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@Service
@Transactional
public class SchemaReviewService implements SchemaReviewUseCase {
    private final SchemaReviewRepository reviewRepository;
    private final SchemaReviewRunRepository reviewRunRepository;
    private final SchemaReviewRunSubmissionRepository submissionRepository;
    private final SchemaReviewAssignmentService assignments;
    private final WorkspaceAccessService workspaceAccess;
    private final WorkspaceAuthorizationService authorization;
    private final UserLookupService users;
    private final SchemaRepository schemas;
    private final SchemaVersionRepository versions;
    private final SchemaModelBindingRepository bindings;
    private final PredictionRunRepository runs;
    private final PredictionResultRepository results;
    private final PredictionResultFeedbackRepository feedback;

    public SchemaReviewService(SchemaReviewRepository reviewRepository,
            SchemaReviewRunRepository reviewRunRepository,
            SchemaReviewRunSubmissionRepository submissionRepository,
            SchemaReviewAssignmentService assignments,
            WorkspaceAccessService workspaceAccess, WorkspaceAuthorizationService authorization,
            UserLookupService users, SchemaRepository schemas, SchemaVersionRepository versions,
            SchemaModelBindingRepository bindings, PredictionRunRepository runs,
            PredictionResultRepository results, PredictionResultFeedbackRepository feedback) {
        this.reviewRepository = reviewRepository;
        this.reviewRunRepository = reviewRunRepository;
        this.submissionRepository = submissionRepository;
        this.assignments = assignments;
        this.workspaceAccess = workspaceAccess;
        this.authorization = authorization;
        this.users = users;
        this.schemas = schemas;
        this.versions = versions;
        this.bindings = bindings;
        this.runs = runs;
        this.results = results;
        this.feedback = feedback;
    }

    public void create(Long userId, CreateSchemaReviewRequest request) {
        Long organizationId = organizationId(userId);
        authorization.requireReviewManagement(userId, organizationId);
        Schema schema = schemas.findByIdAndOrganizationId(request.schemaId(), organizationId)
                .orElseThrow(() -> badRequest("Schema unavailable"));
        SchemaVersion version = versions.findByIdAndOrganizationId(request.versionId(), organizationId)
                .filter(candidate -> candidate.getSchema().getId().equals(schema.getId()))
                .orElseThrow(() -> badRequest("Schema version unavailable"));
        List<PredictionRun> selectedRuns = selectedRuns(request.runIds(), organizationId, version.getId());
        OffsetDateTime expiresAt = request.expiresAt() == null ? now().plusDays(30) : request.expiresAt();
        if (!expiresAt.isAfter(now())) throw badRequest("Review expiry must be in the future");
        SchemaReview review = reviewRepository.save(new SchemaReview(
                schema.getOrganization(), schema, version, users.requireById(userId), expiresAt));
        assignments.assign(review, request.reviewerIds());
        selectedRuns.forEach(run -> reviewRunRepository.save(new SchemaReviewRun(review, run)));
    }

    @Transactional(readOnly = true)
    public List<SchemaReviewContextDto> inbox(Long userId) {
        Long organizationId = organizationId(userId);
        authorization.requireReviewAccess(userId, organizationId);
        return reviewRepository.findByOrganizationIdOrderByCreatedAtDesc(organizationId).stream()
                .filter(this::isOpen)
                .filter(review -> assignments.isAssigned(review.getId(), userId))
                .map(review -> contextDto(userId, review))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SchemaReviewReviewerDto> eligibleReviewers(Long userId) {
        Long organizationId = organizationId(userId);
        return assignments.eligibleReviewers(userId, organizationId);
    }

    private SchemaReviewContextDto contextDto(Long userId, SchemaReview review) {
        Map<Long, SchemaReviewRunSubmission> submissions = submissionRepository
                .findByReviewRunReviewIdAndUserId(review.getId(), userId).stream()
                .collect(Collectors.toMap(item -> item.getReviewRun().getId(), item -> item));
        List<SchemaReviewRunListItemDto> reviewRuns = reviewRunRepository.findByReviewIdOrderByIdAsc(review.getId())
                .stream().map(item -> runItem(userId, item, submissions.get(item.getId()))).toList();
        return new SchemaReviewContextDto(review.getPublicId(), SchemaDto.from(review.getSchema()),
                SchemaVersionDto.from(review.getSchemaVersion(), bindings.findBySchemaVersionId(review.getSchemaVersion().getId())),
                reviewRuns);
    }

    @Transactional(readOnly = true)
    public SchemaReviewRunDetailDto detail(Long userId, String publicId, String reviewRunId) {
        SchemaReviewRun selected = openReviewRun(userId, publicId, reviewRunId);
        requireNotSubmitted(userId, selected);
        List<PredictionResult> runResults = results.findByRunIdOrderByIdAsc(selected.getRun().getId());
        List<PredictionResultFeedbackDto> userFeedback = runResults.stream()
                .flatMap(result -> feedback.findByResultIdAndUserId(result.getId(), userId).stream())
                .map(PredictionResultFeedbackDto::from).toList();
        return new SchemaReviewRunDetailDto(PredictionRunDto.from(selected.getRun(), runResults), userFeedback);
    }

    public PredictionResultFeedbackDto createFeedback(Long userId, String publicId, String reviewRunId,
            CreatePredictionResultFeedbackRequest request) {
        SchemaReviewRun selected = openReviewRun(userId, publicId, reviewRunId);
        requireNotSubmitted(userId, selected);
        PredictionResult result = results.findById(request.resultId()).orElseThrow(SchemaReviewUnavailableException::new);
        if (!result.getRun().getId().equals(selected.getRun().getId())) throw new SchemaReviewUnavailableException();
        PredictionResultFeedback item = feedback
                .findByResultIdAndUserIdAndTypeAndOrder(result.getId(), userId, request.type(), request.order())
                .orElseGet(() -> new PredictionResultFeedback(result, users.requireById(userId),
                        request.type(), request.order(), request.value()));
        item.setValue(request.value());
        return PredictionResultFeedbackDto.from(feedback.save(item));
    }

    public PredictionResultFeedbackDto updateFeedback(Long userId, String publicId, String reviewRunId,
            UpdatePredictionResultFeedbackRequest request) {
        SchemaReviewRun selected = openReviewRun(userId, publicId, reviewRunId);
        requireNotSubmitted(userId, selected);
        PredictionResultFeedback item = feedback.findById(request.feedbackId())
                .orElseThrow(SchemaReviewUnavailableException::new);
        boolean invalid = !userId.equals(item.getUser().getId())
                || !selected.getRun().getId().equals(item.getResult().getRun().getId());
        if (invalid) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        item.setValue(request.value());
        return PredictionResultFeedbackDto.from(feedback.save(item));
    }

    public void submit(Long userId, String publicId, List<String> reviewRunIds) {
        User user = users.requireById(userId);
        reviewRunIds.stream().distinct().forEach(reviewRunId -> {
            SchemaReviewRun selected = openReviewRun(userId, publicId, reviewRunId);
            submissionRepository.findByReviewRunIdAndUserId(selected.getId(), userId)
                    .orElseGet(() -> submissionRepository.save(new SchemaReviewRunSubmission(selected, user, now())));
        });
    }

    private SchemaReview accessibleReview(Long userId, String publicId) {
        Long organizationId = organizationId(userId);
        authorization.requireReviewAccess(userId, organizationId);
        SchemaReview review = requireReview(publicId, organizationId);
        if (!assignments.isAssigned(review.getId(), userId) || !isOpen(review)) {
            throw new SchemaReviewUnavailableException();
        }
        return review;
    }

    private SchemaReviewRun openReviewRun(Long userId, String publicId, String reviewRunId) {
        SchemaReview review = accessibleReview(userId, publicId);
        return reviewRunRepository.findByReviewIdAndPublicId(review.getId(), reviewRunId)
                .orElseThrow(SchemaReviewUnavailableException::new);
    }

    private SchemaReview requireReview(String publicId, Long organizationId) {
        return reviewRepository.findByPublicIdAndOrganizationId(publicId, organizationId)
                .orElseThrow(SchemaReviewUnavailableException::new);
    }

    private SchemaReviewRunListItemDto runItem(Long userId, SchemaReviewRun item,
            SchemaReviewRunSubmission submission) {
        String reviewState = submission != null ? "COMPLETED"
                : hasFeedback(userId, item.getRun()) ? "IN_PROGRESS" : "PENDING";
        OffsetDateTime stateAt = submission == null ? item.getRun().getCreatedAt() : submission.getSubmittedAt();
        return new SchemaReviewRunListItemDto(item.getPublicId(),
                PredictionRunDto.from(item.getRun(), results.findByRunIdOrderByIdAsc(item.getRun().getId())),
                reviewState, stateAt, submission == null ? null : submission.getSubmittedAt());
    }

    private List<PredictionRun> selectedRuns(List<Long> ids, Long organizationId, Long versionId) {
        List<PredictionRun> selected = ids.stream().distinct()
                .map(id -> runs.findByIdAndOrganizationId(id, organizationId)
                        .filter(run -> run.getSchemaVersion().getId().equals(versionId))
                        .orElseThrow(() -> badRequest("Prediction run unavailable")))
                .toList();
        if (selected.isEmpty() || selected.size() != new HashSet<>(ids).size()) throw badRequest("Run list invalid");
        return selected;
    }

    private boolean hasFeedback(Long userId, PredictionRun run) {
        return results.findByRunIdOrderByIdAsc(run.getId()).stream()
                .anyMatch(result -> !feedback.findByResultIdAndUserId(result.getId(), userId).isEmpty());
    }

    private void requireNotSubmitted(Long userId, SchemaReviewRun reviewRun) {
        if (submissionRepository.existsByReviewRunIdAndUserId(reviewRun.getId(), userId)) {
            throw new SchemaReviewUnavailableException();
        }
    }

    private boolean isOpen(SchemaReview review) {
        return review.getExpiresAt().isAfter(now());
    }

    private Long organizationId(Long userId) {
        return workspaceAccess.requireCurrentOrganization(userId).getId();
    }

    private OffsetDateTime now() {
        return OffsetDateTime.now(ZoneOffset.UTC);
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
