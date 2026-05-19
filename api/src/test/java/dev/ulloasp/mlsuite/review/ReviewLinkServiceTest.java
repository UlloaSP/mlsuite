package dev.ulloasp.mlsuite.review;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.prediction.adapter.out.persistence.repository.ExplanationFeedbackRepository;
import dev.ulloasp.mlsuite.prediction.adapter.out.persistence.repository.OutputFeedbackRepository;
import dev.ulloasp.mlsuite.prediction.adapter.out.persistence.repository.PredictionRepository;
import dev.ulloasp.mlsuite.prediction.adapter.out.persistence.repository.TargetRepository;
import dev.ulloasp.mlsuite.prediction.application.dto.CreateOutputFeedbackParams;
import dev.ulloasp.mlsuite.prediction.application.service.PredictionFeedbackStatusResolver;
import dev.ulloasp.mlsuite.prediction.domain.model.OutputFeedback;
import dev.ulloasp.mlsuite.prediction.domain.model.Prediction;
import dev.ulloasp.mlsuite.prediction.domain.model.PredictionStatus;
import dev.ulloasp.mlsuite.review.adapter.out.persistence.repository.ReviewLinkPredictionRepository;
import dev.ulloasp.mlsuite.review.adapter.out.persistence.repository.ReviewLinkPredictionSubmissionRepository;
import dev.ulloasp.mlsuite.review.adapter.out.persistence.repository.ReviewLinkRepository;
import dev.ulloasp.mlsuite.review.application.dto.CreateReviewLinkRequest;
import dev.ulloasp.mlsuite.review.application.service.ReviewLinkDependencies;
import dev.ulloasp.mlsuite.review.application.service.ReviewLinkService;
import dev.ulloasp.mlsuite.review.application.service.ReviewLinkTokenPayload;
import dev.ulloasp.mlsuite.review.application.service.ReviewLinkTokenService;
import dev.ulloasp.mlsuite.review.application.service.ReviewLinkUnavailableException;
import dev.ulloasp.mlsuite.review.application.service.ReviewPredictionTokenPayload;
import dev.ulloasp.mlsuite.review.domain.model.ReviewLink;
import dev.ulloasp.mlsuite.review.domain.model.ReviewLinkPrediction;
import dev.ulloasp.mlsuite.signature.adapter.out.persistence.repository.SignatureRepository;
import dev.ulloasp.mlsuite.signature.domain.model.Signature;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@ExtendWith(MockitoExtension.class)
class ReviewLinkServiceTest {

    @Mock private ReviewLinkRepository linkRepository;
    @Mock private ReviewLinkPredictionRepository linkPredictionRepository;
    @Mock private ReviewLinkPredictionSubmissionRepository submissionRepository;
    @Mock private ReviewLinkTokenService tokenService;
    @Mock private WorkspaceAccessService workspaceAccessService;
    @Mock private WorkspaceAuthorizationService authorizationService;
    @Mock private UserLookupService userLookupService;
    @Mock private ModelRepository modelRepository;
    @Mock private SignatureRepository signatureRepository;
    @Mock private PredictionRepository predictionRepository;
    @Mock private TargetRepository targetRepository;
    @Mock private OutputFeedbackRepository outputFeedbackRepository;
    @Mock private ExplanationFeedbackRepository explanationFeedbackRepository;
    @Mock private PredictionFeedbackStatusResolver feedbackStatusResolver;

    private final ObjectMapper mapper = new ObjectMapper();
    private ReviewLinkService service;

    @BeforeEach
    void setUp() {
        service = new ReviewLinkService(new ReviewLinkDependencies(
                linkRepository,
                linkPredictionRepository,
                submissionRepository,
                tokenService,
                workspaceAccessService,
                authorizationService,
                userLookupService,
                modelRepository,
                signatureRepository,
                predictionRepository,
                targetRepository,
                outputFeedbackRepository,
                explanationFeedbackRepository,
                feedbackStatusResolver));
    }

    @Test
    void create_SucceedsForManagerWithSelectedPredictions() {
        stubManagerCreate();
        when(linkRepository.save(any(ReviewLink.class))).thenAnswer(invocation -> {
            ReviewLink link = invocation.getArgument(0);
            link.setId(123L);
            return link;
        });
        when(tokenService.encrypt(any(ReviewLinkTokenPayload.class))).thenReturn("token");
        when(tokenService.hash("token")).thenReturn("hash");

        var response = service.create(3L, new CreateReviewLinkRequest(
                7L,
                11L,
                List.of(101L),
                OffsetDateTime.now(ZoneOffset.UTC).plusDays(30)), "https://ui.test");

        assertEquals(123L, response.id());
        assertEquals("https://ui.test/review/token", response.url());
        assertEquals(1, response.predictionCount());
        verify(authorizationService).requireReviewLinkManagement(3L, 41L);
        verify(linkPredictionRepository).save(any(ReviewLinkPrediction.class));
    }

    @Test
    void create_RejectsEmptyPredictionList() {
        when(userLookupService.requireById(3L)).thenReturn(user(3L));
        when(workspaceAccessService.requireCurrentOrganization(3L)).thenReturn(organization());
        when(modelRepository.findByIdAndOrganizationId(7L, 41L)).thenReturn(Optional.of(model()));
        when(signatureRepository.findByIdAndOrganizationId(11L, 41L)).thenReturn(Optional.of(signature()));

        ResponseStatusException thrown = assertThrows(ResponseStatusException.class,
                () -> service.create(3L, new CreateReviewLinkRequest(7L, 11L, List.of(), null), "https://ui.test"));

        assertEquals(HttpStatus.BAD_REQUEST, thrown.getStatusCode());
    }

    @Test
    void context_AcceptsExternalReviewerAndReturnsSelectedPredictions() {
        ReviewLink link = activeLink();
        when(tokenService.decrypt("token")).thenReturn(payload());
        when(tokenService.hash("token")).thenReturn("hash");
        when(linkRepository.findByTokenHash("hash")).thenReturn(Optional.of(link));
        when(authorizationService.canPreviewReviewLink(3L, 41L)).thenReturn(false);
        when(authorizationService.isExternalReviewer(3L, 41L)).thenReturn(true);
        when(linkPredictionRepository.findByReviewLinkId(123L))
                .thenReturn(List.of(new ReviewLinkPrediction(link, prediction())));
        when(submissionRepository.findByReviewLinkIdAndUserId(123L, 3L)).thenReturn(List.of());
        when(outputFeedbackRepository.findByPredictionIdAndUserId(101L, 3L)).thenReturn(List.of());
        when(explanationFeedbackRepository.findByPredictionIdAndUserId(101L, 3L)).thenReturn(List.of());
        when(tokenService.encrypt(any(ReviewPredictionTokenPayload.class))).thenReturn("selection-token");

        var context = service.context(3L, "token");

        assertEquals(41L, context.organization().id());
        assertEquals(1, context.predictions().size());
        assertEquals("selection-token", context.predictions().get(0).selectionToken());
        assertEquals(101L, context.predictions().get(0).prediction().id());
    }

    @Test
    void context_RejectsUnrelatedOrgMember() {
        when(tokenService.decrypt("token")).thenReturn(payload());
        when(tokenService.hash("token")).thenReturn("hash");
        when(linkRepository.findByTokenHash("hash")).thenReturn(Optional.of(activeLink()));

        ResponseStatusException thrown = assertThrows(ResponseStatusException.class,
                () -> service.context(3L, "token"));

        assertEquals(HttpStatus.FORBIDDEN, thrown.getStatusCode());
    }
    @Test
    void context_RejectsHashMismatchExpiredAndRevokedLinks() {
        when(tokenService.decrypt("missing")).thenReturn(payload());
        when(tokenService.hash("missing")).thenReturn("nope");
        when(linkRepository.findByTokenHash("nope")).thenReturn(Optional.empty());
        assertThrows(ReviewLinkUnavailableException.class, () -> service.context(3L, "missing"));

        ReviewLink expired = activeLink();
        expired.setExpiresAt(OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(1));
        when(tokenService.decrypt("expired")).thenReturn(payload());
        when(tokenService.hash("expired")).thenReturn("hash");
        when(linkRepository.findByTokenHash("hash")).thenReturn(Optional.of(expired));
        assertThrows(ReviewLinkUnavailableException.class, () -> service.context(3L, "expired"));

        ReviewLink revoked = activeLink();
        revoked.setRevokedAt(OffsetDateTime.now(ZoneOffset.UTC));
        when(tokenService.decrypt("revoked")).thenReturn(payload());
        when(tokenService.hash("revoked")).thenReturn("hash");
        when(linkRepository.findByTokenHash("hash")).thenReturn(Optional.of(revoked));
        assertThrows(ReviewLinkUnavailableException.class, () -> service.context(3L, "revoked"));
    }
    @Test
    void detail_RejectsPredictionOutsideSelectedSet() {
        stubAccessiblePreview(activeLink(), "token");
        when(tokenService.decryptPrediction("selection-token")).thenReturn(predictionPayload(999L));
        when(linkPredictionRepository.findByReviewLinkIdAndPredictionId(123L, 999L)).thenReturn(Optional.empty());

        assertThrows(ReviewLinkUnavailableException.class, () -> service.detail(3L, "token", "selection-token"));
    }

    @Test
    void createOutputFeedback_SavesCurrentUserFeedbackForSelectedPrediction() {
        ReviewLink link = activeLink();
        Prediction prediction = prediction();
        stubAccessiblePreview(link, "token");
        ReviewLinkPrediction selected = new ReviewLinkPrediction(link, prediction);
        selected.setId(700L);
        when(linkPredictionRepository.findByReviewLinkIdAndPredictionId(123L, 101L)).thenReturn(Optional.of(selected));
        when(predictionRepository.findByIdAndOrganizationId(101L, 41L)).thenReturn(Optional.of(prediction));
        when(submissionRepository.existsByReviewLinkPredictionIdAndUserId(700L, 3L)).thenReturn(false);
        when(userLookupService.requireById(3L)).thenReturn(user(3L));
        when(outputFeedbackRepository.save(any(OutputFeedback.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(feedbackStatusResolver.resolve(3L, prediction)).thenReturn(PredictionStatus.COMPLETED);
        when(predictionRepository.save(prediction)).thenReturn(prediction);

        var result = service.createOutputFeedback(3L, "token", new CreateOutputFeedbackParams(
                101L,
                0,
                mapper.valueToTree(Map.of("assessment", "correct"))));

        assertEquals(101L, result.predictionId());
        assertEquals(PredictionStatus.COMPLETED, prediction.getStatus());
    }

    private void stubManagerCreate() {
        when(userLookupService.requireById(3L)).thenReturn(user(3L));
        when(workspaceAccessService.requireCurrentOrganization(3L)).thenReturn(organization());
        when(modelRepository.findByIdAndOrganizationId(7L, 41L)).thenReturn(Optional.of(model()));
        when(signatureRepository.findByIdAndOrganizationId(11L, 41L)).thenReturn(Optional.of(signature()));
        when(predictionRepository.findByIdAndOrganizationId(101L, 41L)).thenReturn(Optional.of(prediction()));
    }

    private void stubAccessiblePreview(ReviewLink link, String token) {
        when(tokenService.decrypt(token)).thenReturn(payload());
        when(tokenService.hash(token)).thenReturn("hash");
        when(linkRepository.findByTokenHash("hash")).thenReturn(Optional.of(link));
        when(authorizationService.canPreviewReviewLink(3L, 41L)).thenReturn(true);
    }

    private ReviewLink activeLink() {
        ReviewLink link = new ReviewLink(organization(), model(), signature(), user(4L), "hash", OffsetDateTime.now(ZoneOffset.UTC).plusDays(1));
        link.setId(123L);
        return link;
    }

    private ReviewLinkTokenPayload payload() {
        return new ReviewLinkTokenPayload(1, 123L, 41L, 7L, 11L, OffsetDateTime.now(ZoneOffset.UTC).plusDays(1), "nonce");
    }

    private ReviewPredictionTokenPayload predictionPayload(Long predictionId) {
        return new ReviewPredictionTokenPayload(1, 123L, predictionId, OffsetDateTime.now(ZoneOffset.UTC).plusDays(1));
    }

    private Prediction prediction() {
        Prediction prediction = new Prediction();
        prediction.setId(101L);
        prediction.setName("pred");
        prediction.setSignature(signature());
        prediction.setData(Map.of("x", 1));
        prediction.setPrediction(Map.of("y", 2));
        prediction.setStatus(PredictionStatus.PENDING);
        return prediction;
    }

    private Signature signature() {
        Signature signature = new Signature();
        signature.setId(11L);
        signature.setName("sig");
        signature.setModel(model());
        signature.setInputSignature(Map.of("reports", List.of()));
        return signature;
    }

    private Model model() {
        Model model = new Model();
        model.setId(7L);
        model.setName("model");
        model.setType("sklearn");
        model.setSpecificType("classifier");
        model.setFileName("model.pkl");
        model.setUser(user(4L));
        model.setOrganization(organization());
        return model;
    }

    private Organization organization() {
        Organization organization = new Organization();
        organization.setId(41L);
        organization.setSlug("org");
        organization.setName("Org");
        organization.setCreatedBy(user(4L));
        return organization;
    }

    private User user(Long id) {
        User user = new User();
        user.setId(id);
        user.setUsername("user-" + id);
        user.setEmail("user-" + id + "@test.local");
        user.setFullName("User " + id);
        return user;
    }
}
