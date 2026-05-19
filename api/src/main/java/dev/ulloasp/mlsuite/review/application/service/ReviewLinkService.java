package dev.ulloasp.mlsuite.review.application.service;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.application.dto.ModelDto;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.prediction.adapter.out.persistence.repository.ExplanationFeedbackRepository;
import dev.ulloasp.mlsuite.prediction.adapter.out.persistence.repository.OutputFeedbackRepository;
import dev.ulloasp.mlsuite.prediction.adapter.out.persistence.repository.PredictionRepository;
import dev.ulloasp.mlsuite.prediction.adapter.out.persistence.repository.TargetRepository;
import dev.ulloasp.mlsuite.prediction.application.dto.CreateExplanationFeedbackParams;
import dev.ulloasp.mlsuite.prediction.application.dto.CreateOutputFeedbackParams;
import dev.ulloasp.mlsuite.prediction.application.dto.ExplanationFeedbackDto;
import dev.ulloasp.mlsuite.prediction.application.dto.OutputFeedbackDto;
import dev.ulloasp.mlsuite.prediction.application.dto.PredictionDto;
import dev.ulloasp.mlsuite.prediction.application.dto.TargetDto;
import dev.ulloasp.mlsuite.prediction.application.dto.UpdateExplanationFeedbackParams;
import dev.ulloasp.mlsuite.prediction.application.dto.UpdateOutputFeedbackParams;
import dev.ulloasp.mlsuite.prediction.application.service.PredictionFeedbackStatusResolver;
import dev.ulloasp.mlsuite.prediction.domain.model.ExplanationFeedback;
import dev.ulloasp.mlsuite.prediction.domain.model.OutputFeedback;
import dev.ulloasp.mlsuite.prediction.domain.model.Prediction;
import dev.ulloasp.mlsuite.review.adapter.out.persistence.repository.ReviewLinkPredictionRepository;
import dev.ulloasp.mlsuite.review.adapter.out.persistence.repository.ReviewLinkPredictionSubmissionRepository;
import dev.ulloasp.mlsuite.review.adapter.out.persistence.repository.ReviewLinkRepository;
import dev.ulloasp.mlsuite.review.application.dto.CreateReviewLinkRequest;
import dev.ulloasp.mlsuite.review.application.dto.ReviewLinkContextDto;
import dev.ulloasp.mlsuite.review.application.dto.ReviewLinkCreateResponse;
import dev.ulloasp.mlsuite.review.application.dto.ReviewLinkSummaryDto;
import dev.ulloasp.mlsuite.review.application.dto.ReviewOrganizationDto;
import dev.ulloasp.mlsuite.review.application.dto.ReviewPredictionListItemDto;
import dev.ulloasp.mlsuite.review.application.dto.ReviewPredictionState;
import dev.ulloasp.mlsuite.review.application.dto.ReviewPredictionDetailDto;
import dev.ulloasp.mlsuite.review.domain.model.ReviewLink;
import dev.ulloasp.mlsuite.review.domain.model.ReviewLinkPrediction;
import dev.ulloasp.mlsuite.review.domain.model.ReviewLinkPredictionSubmission;
import dev.ulloasp.mlsuite.signature.adapter.out.persistence.repository.SignatureRepository;
import dev.ulloasp.mlsuite.signature.application.dto.SignatureDto;
import dev.ulloasp.mlsuite.signature.domain.model.Signature;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
@Service
@Transactional
public class ReviewLinkService {
    private final ReviewLinkRepository linkRepository;
    private final ReviewLinkPredictionRepository linkPredictionRepository;
    private final ReviewLinkPredictionSubmissionRepository submissionRepository;
    private final ReviewLinkTokenService tokenService;
    private final WorkspaceAccessService workspaceAccessService;
    private final WorkspaceAuthorizationService authorizationService;
    private final UserLookupService userLookupService;
    private final ModelRepository modelRepository;
    private final SignatureRepository signatureRepository;
    private final PredictionRepository predictionRepository;
    private final TargetRepository targetRepository;
    private final OutputFeedbackRepository outputFeedbackRepository;
    private final ExplanationFeedbackRepository explanationFeedbackRepository;
    private final PredictionFeedbackStatusResolver feedbackStatusResolver;
    private final ReviewPredictionStateResolver stateResolver;
    private final SecureRandom random = new SecureRandom();
    public ReviewLinkService(ReviewLinkDependencies deps) {
        this.linkRepository = deps.linkRepository();
        this.linkPredictionRepository = deps.linkPredictionRepository();
        this.submissionRepository = deps.submissionRepository();
        this.tokenService = deps.tokenService();
        this.workspaceAccessService = deps.workspaceAccessService();
        this.authorizationService = deps.authorizationService();
        this.userLookupService = deps.userLookupService();
        this.modelRepository = deps.modelRepository();
        this.signatureRepository = deps.signatureRepository();
        this.predictionRepository = deps.predictionRepository();
        this.targetRepository = deps.targetRepository();
        this.outputFeedbackRepository = deps.outputFeedbackRepository();
        this.explanationFeedbackRepository = deps.explanationFeedbackRepository();
        this.feedbackStatusResolver = deps.feedbackStatusResolver();
        this.stateResolver = new ReviewPredictionStateResolver(outputFeedbackRepository, explanationFeedbackRepository);
    }
    public ReviewLinkCreateResponse create(Long userId, CreateReviewLinkRequest request, String origin) {
        User user = userLookupService.requireById(userId);
        Long orgId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        authorizationService.requireReviewLinkManagement(userId, orgId);
        Model model = modelRepository.findByIdAndOrganizationId(request.modelId(), orgId)
                .orElseThrow(() -> badRequest("Model unavailable"));
        Signature signature = signatureRepository.findByIdAndOrganizationId(request.signatureId(), orgId)
                .filter(candidate -> candidate.getModel().getId().equals(model.getId()))
                .orElseThrow(() -> badRequest("Schema unavailable"));
        List<Prediction> predictions = selectedPredictions(request.predictionIds(), orgId, signature.getId());
        OffsetDateTime expiresAt = request.expiresAt() == null
                ? OffsetDateTime.now(ZoneOffset.UTC).plusDays(30)
                : request.expiresAt();
        ReviewLink link = linkRepository.save(new ReviewLink(model.getOrganization(), model, signature, user, "pending", expiresAt));
        String token = tokenService.encrypt(new ReviewLinkTokenPayload(1, link.getId(), orgId, model.getId(), signature.getId(), expiresAt, nonce()));
        link.setTokenHash(tokenService.hash(token));
        link.setToken(token);
        predictions.forEach(prediction -> linkPredictionRepository.save(new ReviewLinkPrediction(link, prediction)));
        return new ReviewLinkCreateResponse(link.getId(), baseUrl(origin) + "/review/" + token, expiresAt, predictions.size());
    }
    @Transactional(readOnly = true)
    public List<ReviewLinkSummaryDto> list(Long userId, Long modelId, Long signatureId) {
        Long orgId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        authorizationService.requireReviewLinkManagement(userId, orgId);
        return linkRepository.findByModelIdAndSignatureIdAndOrganizationIdOrderByCreatedAtDesc(modelId, signatureId, orgId)
                .stream()
                .map(link -> ReviewLinkSummaryDto.from(link, (int) linkPredictionRepository.countByReviewLinkId(link.getId())))
                .toList();
    }
    public void revoke(Long userId, Long id) {
        Long orgId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        authorizationService.requireReviewLinkManagement(userId, orgId);
        ReviewLink link = linkRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(ReviewLinkUnavailableException::new);
        link.setRevokedAt(OffsetDateTime.now(ZoneOffset.UTC));
    }
    @Transactional(readOnly = true)
    public ReviewLinkContextDto context(Long userId, String token) {
        ReviewLink link = requireAccessible(userId, token);
        Map<Long, ReviewLinkPredictionSubmission> submissions = submissionRepository
                .findByReviewLinkIdAndUserId(link.getId(), userId)
                .stream()
                .collect(Collectors.toMap(s -> s.getReviewLinkPrediction().getId(), Function.identity()));
        List<ReviewPredictionListItemDto> predictions = linkPredictionRepository.findByReviewLinkId(link.getId())
                .stream()
                .filter(item -> item.getPrediction().getSignature().getId().equals(link.getSignature().getId()))
                .map(item -> reviewPredictionItem(userId, item, submissions.get(item.getId())))
                .filter(item -> item.reviewState() != ReviewPredictionState.SUBMITTED)
                .toList();
        return new ReviewLinkContextDto(
                ReviewOrganizationDto.from(link.getOrganization()),
                ModelDto.toDto(link.getModel()),
                SignatureDto.toDto(link.getSignature()),
                predictions);
    }
    @Transactional(readOnly = true)
    public ReviewPredictionDetailDto detail(Long userId, String token, String predictionToken) {
        ReviewLink link = requireAccessible(userId, token);
        Long predictionId = resolvePredictionId(link, predictionToken);
        ReviewLinkPrediction selected = requireSelectedLinkPrediction(link, predictionId);
        requireNotSubmitted(userId, selected);
        Prediction prediction = selected.getPrediction();
        return new ReviewPredictionDetailDto(
                PredictionDto.toDto(prediction),
                TargetDto.toDtoList(targetRepository.findByPredictionIdAndOrganizationId(predictionId, link.getOrganization().getId())),
                OutputFeedbackDto.toDtoList(outputFeedbackRepository.findByPredictionIdAndUserId(predictionId, userId)),
                ExplanationFeedbackDto.toDtoList(explanationFeedbackRepository.findByPredictionIdAndUserId(predictionId, userId)));
    }
    public OutputFeedbackDto createOutputFeedback(Long userId, String token, CreateOutputFeedbackParams params) {
        ReviewLink link = requireAccessible(userId, token);
        ReviewLinkPrediction selected = requireSelectedLinkPrediction(link, params.predictionId());
        requireNotSubmitted(userId, selected);
        Prediction prediction = selected.getPrediction();
        OutputFeedback saved = outputFeedbackRepository.save(new OutputFeedback(prediction, userLookupService.requireById(userId), params.order(), params.value()));
        updateStatus(userId, prediction);
        return OutputFeedbackDto.toDto(saved);
    }
    public OutputFeedbackDto updateOutputFeedback(Long userId, String token, UpdateOutputFeedbackParams params) {
        ReviewLink link = requireAccessible(userId, token);
        OutputFeedback feedback = outputFeedbackRepository.findById(params.outputFeedbackId()).orElseThrow(ReviewLinkUnavailableException::new);
        requireOwnSelectedFeedback(userId, link, feedback.getUser().getId(), feedback.getPrediction().getId());
        requireNotSubmitted(userId, requireSelectedLinkPrediction(link, feedback.getPrediction().getId()));
        feedback.setValue(params.value());
        updateStatus(userId, feedback.getPrediction());
        return OutputFeedbackDto.toDto(outputFeedbackRepository.save(feedback));
    }
    public ExplanationFeedbackDto createExplanationFeedback(Long userId, String token, CreateExplanationFeedbackParams params) {
        ReviewLink link = requireAccessible(userId, token);
        ReviewLinkPrediction selected = requireSelectedLinkPrediction(link, params.predictionId());
        requireNotSubmitted(userId, selected);
        Prediction prediction = selected.getPrediction();
        ExplanationFeedback saved = explanationFeedbackRepository.save(new ExplanationFeedback(prediction, userLookupService.requireById(userId), params.order(), params.value()));
        updateStatus(userId, prediction);
        return ExplanationFeedbackDto.toDto(saved);
    }
    public ExplanationFeedbackDto updateExplanationFeedback(Long userId, String token, UpdateExplanationFeedbackParams params) {
        ReviewLink link = requireAccessible(userId, token);
        ExplanationFeedback feedback = explanationFeedbackRepository.findById(params.explanationFeedbackId()).orElseThrow(ReviewLinkUnavailableException::new);
        requireOwnSelectedFeedback(userId, link, feedback.getUser().getId(), feedback.getPrediction().getId());
        requireNotSubmitted(userId, requireSelectedLinkPrediction(link, feedback.getPrediction().getId()));
        feedback.setRealValue(params.realValue());
        updateStatus(userId, feedback.getPrediction());
        return ExplanationFeedbackDto.toDto(explanationFeedbackRepository.save(feedback));
    }
    public void submit(Long userId, String token, List<String> predictionTokens) {
        ReviewLink link = requireAccessible(userId, token);
        User user = userLookupService.requireById(userId);
        predictionTokens.stream().map(value -> resolvePredictionId(link, value)).distinct().forEach(predictionId -> {
            ReviewLinkPrediction selected = requireSelectedLinkPrediction(link, predictionId);
            submissionRepository.findByReviewLinkPredictionIdAndUserId(selected.getId(), userId)
                    .orElseGet(() -> submissionRepository.save(new ReviewLinkPredictionSubmission(
                            selected,
                            user,
                            OffsetDateTime.now(ZoneOffset.UTC))));
        });
    }

    private ReviewLink requireAccessible(Long userId, String token) {
        ReviewLinkTokenPayload payload = tokenService.decrypt(token);
        ReviewLink link = linkRepository.findByTokenHash(tokenService.hash(token)).orElseThrow(ReviewLinkUnavailableException::new);
        if (!link.getId().equals(payload.linkId()) || link.getRevokedAt() != null || link.getExpiresAt().isBefore(OffsetDateTime.now(ZoneOffset.UTC))) {
            throw new ReviewLinkUnavailableException();
        }
        boolean allowed = authorizationService.canPreviewReviewLink(userId, payload.orgId())
                || authorizationService.isExternalReviewer(userId, payload.orgId());
        if (!allowed) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return link;
    }

    private List<Prediction> selectedPredictions(List<Long> ids, Long orgId, Long signatureId) {
        List<Long> uniqueIds = ids.stream().distinct().toList();
        List<Prediction> predictions = uniqueIds.stream()
                .map(id -> predictionRepository.findByIdAndOrganizationId(id, orgId)
                        .filter(prediction -> prediction.getSignature().getId().equals(signatureId))
                        .orElseThrow(() -> badRequest("Prediction unavailable")))
                .toList();
        if (predictions.isEmpty() || predictions.size() != new HashSet<>(ids).size()) {
            throw badRequest("Prediction list invalid");
        }
        return predictions;
    }
    private ReviewLinkPrediction requireSelectedLinkPrediction(ReviewLink link, Long predictionId) {
        ReviewLinkPrediction selected = linkPredictionRepository.findByReviewLinkIdAndPredictionId(link.getId(), predictionId)
                .orElseThrow(ReviewLinkUnavailableException::new);
        predictionRepository.findByIdAndOrganizationId(predictionId, link.getOrganization().getId())
                .filter(prediction -> prediction.getSignature().getId().equals(link.getSignature().getId()))
                .orElseThrow(ReviewLinkUnavailableException::new);
        return selected;
    }

    private Long resolvePredictionId(ReviewLink link, String predictionToken) {
        ReviewPredictionTokenPayload payload = tokenService.decryptPrediction(predictionToken);
        if (!link.getId().equals(payload.linkId()) || payload.exp().isBefore(OffsetDateTime.now(ZoneOffset.UTC))) {
            throw new ReviewLinkUnavailableException();
        }
        return payload.predictionId();
    }

    private void requireOwnSelectedFeedback(Long userId, ReviewLink link, Long feedbackUserId, Long predictionId) {
        if (!userId.equals(feedbackUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        requireSelectedLinkPrediction(link, predictionId);
    }
    private void updateStatus(Long userId, Prediction prediction) {
        prediction.setStatus(feedbackStatusResolver.resolve(userId, prediction));
        predictionRepository.save(prediction);
    }

    private ReviewPredictionListItemDto reviewPredictionItem(
            Long userId,
            ReviewLinkPrediction item,
            ReviewLinkPredictionSubmission submission) {
        Long predictionId = item.getPrediction().getId();
        OffsetDateTime revisionEnteredAt = stateResolver.revisionEnteredAt(userId, predictionId);
        ReviewPredictionState state = submission != null
                ? ReviewPredictionState.SUBMITTED
                : revisionEnteredAt != null ? ReviewPredictionState.REVISION : ReviewPredictionState.PENDING;
        OffsetDateTime stateEnteredAt = submission != null
                ? submission.getSubmittedAt()
                : revisionEnteredAt != null ? revisionEnteredAt : item.getPrediction().getCreatedAt();
        return new ReviewPredictionListItemDto(
                tokenService.encrypt(new ReviewPredictionTokenPayload(1, item.getReviewLink().getId(), predictionId, item.getReviewLink().getExpiresAt())),
                PredictionDto.toDto(item.getPrediction()),
                state,
                stateEnteredAt,
                submission == null ? null : submission.getSubmittedAt());
    }

    private void requireNotSubmitted(Long userId, ReviewLinkPrediction selected) {
        if (submissionRepository.existsByReviewLinkPredictionIdAndUserId(selected.getId(), userId)) {
            throw new ReviewLinkUnavailableException();
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
