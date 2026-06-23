package dev.ulloasp.mlsuite.schema.review.application.service;

import java.security.SecureRandom;
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
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewLinkRepository;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewLinkRunRepository;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewLinkRunSubmissionRepository;
import dev.ulloasp.mlsuite.schema.review.application.dto.CreateSchemaReviewLinkRequest;
import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewLinkContextDto;
import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewLinkCreateResponse;
import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewLinkSummaryDto;
import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewOrganizationDto;
import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewRunDetailDto;
import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewRunListItemDto;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewLink;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewLinkRun;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewLinkRunSubmission;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@Service
@Transactional
public class SchemaReviewLinkService {
    private final SchemaReviewLinkRepository linkRepository;
    private final SchemaReviewLinkRunRepository linkRunRepository;
    private final SchemaReviewLinkRunSubmissionRepository submissionRepository;
    private final SchemaReviewLinkTokenService tokenService;
    private final WorkspaceAccessService workspaceAccessService;
    private final WorkspaceAuthorizationService authorizationService;
    private final UserLookupService userLookupService;
    private final SchemaRepository schemaRepository;
    private final SchemaVersionRepository versionRepository;
    private final SchemaModelBindingRepository bindingRepository;
    private final PredictionRunRepository runRepository;
    private final PredictionResultRepository resultRepository;
    private final PredictionResultFeedbackRepository feedbackRepository;
    private final SecureRandom random = new SecureRandom();

    public SchemaReviewLinkService(SchemaReviewLinkRepository linkRepository,
            SchemaReviewLinkRunRepository linkRunRepository,
            SchemaReviewLinkRunSubmissionRepository submissionRepository,
            SchemaReviewLinkTokenService tokenService, WorkspaceAccessService workspaceAccessService,
            WorkspaceAuthorizationService authorizationService, UserLookupService userLookupService,
            SchemaRepository schemaRepository, SchemaVersionRepository versionRepository,
            SchemaModelBindingRepository bindingRepository, PredictionRunRepository runRepository,
            PredictionResultRepository resultRepository, PredictionResultFeedbackRepository feedbackRepository) {
        this.linkRepository = linkRepository;
        this.linkRunRepository = linkRunRepository;
        this.submissionRepository = submissionRepository;
        this.tokenService = tokenService;
        this.workspaceAccessService = workspaceAccessService;
        this.authorizationService = authorizationService;
        this.userLookupService = userLookupService;
        this.schemaRepository = schemaRepository;
        this.versionRepository = versionRepository;
        this.bindingRepository = bindingRepository;
        this.runRepository = runRepository;
        this.resultRepository = resultRepository;
        this.feedbackRepository = feedbackRepository;
    }

    public SchemaReviewLinkCreateResponse create(Long userId, CreateSchemaReviewLinkRequest request, String origin) {
        User user = userLookupService.requireById(userId);
        Long orgId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        authorizationService.requireReviewLinkManagement(userId, orgId);
        Schema schema = schemaRepository.findByIdAndOrganizationId(request.schemaId(), orgId)
                .orElseThrow(() -> badRequest("Schema unavailable"));
        SchemaVersion version = versionRepository.findByIdAndOrganizationId(request.versionId(), orgId)
                .filter(candidate -> candidate.getSchema().getId().equals(schema.getId()))
                .orElseThrow(() -> badRequest("Schema version unavailable"));
        List<PredictionRun> runs = selectedRuns(request.runIds(), orgId, version.getId());
        OffsetDateTime expiresAt = request.expiresAt() == null
                ? OffsetDateTime.now(ZoneOffset.UTC).plusDays(30)
                : request.expiresAt();
        SchemaReviewLink link = linkRepository.save(new SchemaReviewLink(
                schema.getOrganization(), schema, version, user, "pending", expiresAt));
        String token = tokenService.encrypt(new SchemaReviewLinkTokenPayload(
                1, link.getId(), orgId, schema.getId(), version.getId(), expiresAt, nonce()));
        link.setTokenHash(tokenService.hash(token));
        link.setToken(token);
        runs.forEach(run -> linkRunRepository.save(new SchemaReviewLinkRun(link, run)));
        return new SchemaReviewLinkCreateResponse(link.getId(), baseUrl(origin) + "/schema-review/" + token,
                expiresAt, runs.size());
    }

    @Transactional(readOnly = true)
    public List<SchemaReviewLinkSummaryDto> list(Long userId, Long schemaId, Long versionId) {
        Long orgId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        authorizationService.requireReviewLinkManagement(userId, orgId);
        return linkRepository.findBySchemaIdAndSchemaVersionIdAndOrganizationIdOrderByCreatedAtDesc(
                schemaId, versionId, orgId).stream()
                .map(link -> SchemaReviewLinkSummaryDto.from(link, (int) linkRunRepository.countByReviewLinkId(link.getId())))
                .toList();
    }

    public void revoke(Long userId, Long id) {
        Long orgId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        authorizationService.requireReviewLinkManagement(userId, orgId);
        linkRepository.findByIdAndOrganizationId(id, orgId).orElseThrow(SchemaReviewLinkUnavailableException::new)
                .setRevokedAt(OffsetDateTime.now(ZoneOffset.UTC));
    }

    @Transactional(readOnly = true)
    public SchemaReviewLinkContextDto context(Long userId, String token) {
        SchemaReviewLink link = requireAccessible(userId, token);
        Map<Long, SchemaReviewLinkRunSubmission> submissions = submissionRepository
                .findByReviewLinkRunReviewLinkIdAndUserId(link.getId(), userId).stream()
                .collect(Collectors.toMap(s -> s.getReviewLinkRun().getId(), s -> s));
        List<SchemaReviewRunListItemDto> runs = linkRunRepository.findByReviewLinkIdOrderByIdAsc(link.getId())
                .stream().filter(item -> !submissions.containsKey(item.getId()))
                .map(item -> runItem(userId, item, submissions.get(item.getId()))).toList();
        return new SchemaReviewLinkContextDto(
                SchemaReviewOrganizationDto.from(link.getOrganization()),
                SchemaDto.from(link.getSchema()),
                SchemaVersionDto.from(link.getSchemaVersion(),
                        bindingRepository.findBySchemaVersionId(link.getSchemaVersion().getId())),
                runs);
    }

    @Transactional(readOnly = true)
    public SchemaReviewRunDetailDto detail(Long userId, String token, String runToken) {
        SchemaReviewLink link = requireAccessible(userId, token);
        Long runId = resolveRunId(link, runToken);
        SchemaReviewLinkRun selected = requireSelectedRun(link, runId);
        requireNotSubmitted(userId, selected);
        List<PredictionResult> results = resultRepository.findByRunIdOrderByIdAsc(runId);
        List<PredictionResultFeedbackDto> feedback = results.stream()
                .flatMap(result -> feedbackRepository.findByResultIdAndUserId(result.getId(), userId).stream())
                .map(PredictionResultFeedbackDto::from).toList();
        return new SchemaReviewRunDetailDto(PredictionRunDto.from(selected.getRun(), results), feedback);
    }

    public PredictionResultFeedbackDto createFeedback(Long userId, String token,
            CreatePredictionResultFeedbackRequest request) {
        SchemaReviewLink link = requireAccessible(userId, token);
        PredictionResult result = resultRepository.findById(request.resultId()).orElseThrow(SchemaReviewLinkUnavailableException::new);
        SchemaReviewLinkRun selected = requireSelectedRun(link, result.getRun().getId());
        requireNotSubmitted(userId, selected);
        PredictionResultFeedback feedback = feedbackRepository
                .findByResultIdAndUserIdAndTypeAndOrder(result.getId(), userId, request.type(), request.order())
                .orElseGet(() -> new PredictionResultFeedback(result, userLookupService.requireById(userId),
                        request.type(), request.order(), request.value()));
        feedback.setValue(request.value());
        return PredictionResultFeedbackDto.from(feedbackRepository.save(feedback));
    }

    public PredictionResultFeedbackDto updateFeedback(Long userId, String token,
            UpdatePredictionResultFeedbackRequest request) {
        SchemaReviewLink link = requireAccessible(userId, token);
        PredictionResultFeedback feedback = feedbackRepository.findById(request.feedbackId())
                .orElseThrow(SchemaReviewLinkUnavailableException::new);
        if (!userId.equals(feedback.getUser().getId())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        SchemaReviewLinkRun selected = requireSelectedRun(link, feedback.getResult().getRun().getId());
        requireNotSubmitted(userId, selected);
        feedback.setValue(request.value());
        return PredictionResultFeedbackDto.from(feedbackRepository.save(feedback));
    }

    public void submit(Long userId, String token, List<String> runTokens) {
        SchemaReviewLink link = requireAccessible(userId, token);
        User user = userLookupService.requireById(userId);
        runTokens.stream().map(value -> resolveRunId(link, value)).distinct().forEach(runId -> {
            SchemaReviewLinkRun selected = requireSelectedRun(link, runId);
            submissionRepository.findByReviewLinkRunIdAndUserId(selected.getId(), userId)
                    .orElseGet(() -> submissionRepository.save(new SchemaReviewLinkRunSubmission(
                            selected, user, OffsetDateTime.now(ZoneOffset.UTC))));
        });
    }

    private List<PredictionRun> selectedRuns(List<Long> ids, Long orgId, Long versionId) {
        List<Long> uniqueIds = ids.stream().distinct().toList();
        List<PredictionRun> runs = uniqueIds.stream()
                .map(id -> runRepository.findByIdAndOrganizationId(id, orgId)
                        .filter(run -> run.getSchemaVersion().getId().equals(versionId))
                        .orElseThrow(() -> badRequest("Prediction run unavailable")))
                .toList();
        if (runs.isEmpty() || runs.size() != new HashSet<>(ids).size()) throw badRequest("Run list invalid");
        return runs;
    }

    private SchemaReviewLink requireAccessible(Long userId, String token) {
        SchemaReviewLinkTokenPayload payload = tokenService.decrypt(token);
        SchemaReviewLink link = linkRepository.findByTokenHash(tokenService.hash(token))
                .orElseThrow(SchemaReviewLinkUnavailableException::new);
        boolean invalid = !link.getId().equals(payload.linkId()) || link.getRevokedAt() != null
                || link.getExpiresAt().isBefore(OffsetDateTime.now(ZoneOffset.UTC));
        if (invalid) throw new SchemaReviewLinkUnavailableException();
        boolean allowed = authorizationService.canPreviewReviewLink(userId, payload.orgId())
                || authorizationService.isExternalReviewer(userId, payload.orgId());
        if (!allowed) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        return link;
    }

    private SchemaReviewLinkRun requireSelectedRun(SchemaReviewLink link, Long runId) {
        return linkRunRepository.findByReviewLinkIdAndRunId(link.getId(), runId)
                .orElseThrow(SchemaReviewLinkUnavailableException::new);
    }

    private Long resolveRunId(SchemaReviewLink link, String runToken) {
        SchemaReviewRunTokenPayload payload = tokenService.decryptRun(runToken);
        if (!link.getId().equals(payload.linkId()) || payload.exp().isBefore(OffsetDateTime.now(ZoneOffset.UTC))) {
            throw new SchemaReviewLinkUnavailableException();
        }
        return payload.runId();
    }

    private SchemaReviewRunListItemDto runItem(Long userId, SchemaReviewLinkRun item,
            SchemaReviewLinkRunSubmission submission) {
        PredictionRun run = item.getRun();
        String state = submission != null ? "SUBMITTED"
                : hasFeedback(userId, run) ? "REVISION" : "PENDING";
        OffsetDateTime stateAt = submission != null ? submission.getSubmittedAt() : run.getCreatedAt();
        return new SchemaReviewRunListItemDto(
                tokenService.encrypt(new SchemaReviewRunTokenPayload(1, item.getReviewLink().getId(),
                        run.getId(), item.getReviewLink().getExpiresAt())),
                PredictionRunDto.from(run, resultRepository.findByRunIdOrderByIdAsc(run.getId())),
                state, stateAt, submission == null ? null : submission.getSubmittedAt());
    }

    private boolean hasFeedback(Long userId, PredictionRun run) {
        return resultRepository.findByRunIdOrderByIdAsc(run.getId()).stream()
                .anyMatch(result -> !feedbackRepository.findByResultIdAndUserId(result.getId(), userId).isEmpty());
    }

    private void requireNotSubmitted(Long userId, SchemaReviewLinkRun selected) {
        if (submissionRepository.existsByReviewLinkRunIdAndUserId(selected.getId(), userId)) {
            throw new SchemaReviewLinkUnavailableException();
        }
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private String nonce() {
        byte[] bytes = new byte[16];
        random.nextBytes(bytes);
        return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String baseUrl(String origin) {
        return origin == null || origin.isBlank() ? "" : origin.replaceAll("/+$", "");
    }
}
