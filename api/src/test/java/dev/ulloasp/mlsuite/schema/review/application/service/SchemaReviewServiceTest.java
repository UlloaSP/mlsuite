package dev.ulloasp.mlsuite.schema.review.application.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.hibernate.annotations.UpdateTimestamp;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultFeedbackRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaVersionRepository;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunStatus;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewRepository;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewAssigneeRepository;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewRunRepository;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewRunSubmissionRepository;
import dev.ulloasp.mlsuite.schema.review.application.dto.CreateSchemaReviewRequest;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReview;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewRun;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import jakarta.persistence.Column;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

@ExtendWith(MockitoExtension.class)
class SchemaReviewServiceTest {
    @Mock private SchemaReviewRepository reviewRepository;
    @Mock private SchemaReviewRunRepository reviewRunRepository;
    @Mock private SchemaReviewRunSubmissionRepository submissionRepository;
    @Mock private SchemaReviewAssignmentService assignments;
    @Mock private OrganizationMembershipRepository memberships;
    @Mock private SchemaReviewAssigneeRepository assigneeRepository;
    @Mock private WorkspaceAccessService workspaceAccess;
    @Mock private WorkspaceAuthorizationService authorization;
    @Mock private UserLookupService users;
    @Mock private SchemaRepository schemas;
    @Mock private SchemaVersionRepository versions;
    @Mock private SchemaModelBindingRepository bindings;
    @Mock private PredictionRunRepository runs;
    @Mock private PredictionResultRepository results;
    @Mock private PredictionResultFeedbackRepository feedback;
    private SchemaReviewService service;

    @BeforeEach
    void setUp() {
        service = new SchemaReviewService(reviewRepository, reviewRunRepository, submissionRepository,
                assignments, workspaceAccess, authorization, users, schemas, versions, bindings, runs, results, feedback);
    }

    @Test
    void create_SavesAssignedOrganizationReview() {
        stubCreateActor();
        when(users.requireById(7L)).thenReturn(user());
        Schema schema = schema();
        SchemaVersion version = version(schema, 9L);
        PredictionRun run = run(version, 50L);
        List<SchemaReviewRun> persistedRuns = new ArrayList<>();
        when(schemas.findByIdAndOrganizationId(5L, 41L)).thenReturn(Optional.of(schema));
        when(versions.findByIdAndOrganizationId(9L, 41L)).thenReturn(Optional.of(version));
        when(runs.findByIdAndOrganizationId(50L, 41L)).thenReturn(Optional.of(run));
        when(reviewRepository.save(any(SchemaReview.class))).thenAnswer(invocation -> {
            SchemaReview review = invocation.getArgument(0);
            review.setId(88L);
            review.setCreatedAt(OffsetDateTime.now());
            return review;
        });
        when(reviewRunRepository.save(any(SchemaReviewRun.class))).thenAnswer(invocation -> {
            SchemaReviewRun reviewRun = invocation.getArgument(0);
            persistedRuns.add(reviewRun);
            return reviewRun;
        });
        service.create(7L,
                new CreateSchemaReviewRequest(5L, 9L, List.of(50L), List.of(12L), null));

        assertEquals(1, persistedRuns.size());
        assertFalse(persistedRuns.getFirst().getReview().getPublicId().isBlank());
        assertEquals(7L, persistedRuns.getFirst().getReview().getCreatedBy().getId());
        verify(authorization).requireReviewManagement(7L, 41L);
        verify(assignments).assign(any(SchemaReview.class), org.mockito.ArgumentMatchers.eq(List.of(12L)));
        verify(reviewRunRepository).save(any(SchemaReviewRun.class));
    }

    @Test
    void review_MapsRequiredUpdatedTimestamp() throws NoSuchFieldException {
        var updatedAt = SchemaReview.class.getDeclaredField("updatedAt");
        var createdBy = SchemaReview.class.getDeclaredField("createdBy");

        assertNotNull(updatedAt.getAnnotation(UpdateTimestamp.class));
        assertEquals("updated_at", updatedAt.getAnnotation(Column.class).name());
        assertNotNull(createdBy.getAnnotation(ManyToOne.class));
        assertEquals("created_by_user_id", createdBy.getAnnotation(JoinColumn.class).name());
    }

    @Test
    void create_RejectsRunOutsideSchemaVersion() {
        stubCreateActor();
        Schema schema = schema();
        SchemaVersion version = version(schema, 9L);
        when(schemas.findByIdAndOrganizationId(5L, 41L)).thenReturn(Optional.of(schema));
        when(versions.findByIdAndOrganizationId(9L, 41L)).thenReturn(Optional.of(version));
        when(runs.findByIdAndOrganizationId(50L, 41L))
                .thenReturn(Optional.of(run(version(schema, 10L), 50L)));

        assertThrows(ResponseStatusException.class, () -> service.create(7L,
                new CreateSchemaReviewRequest(5L, 9L, List.of(50L), List.of(12L), null)));
    }

    @Test
    void create_RejectsPastExpiry() {
        stubCreateActor();
        Schema schema = schema();
        SchemaVersion version = version(schema, 9L);
        when(schemas.findByIdAndOrganizationId(5L, 41L)).thenReturn(Optional.of(schema));
        when(versions.findByIdAndOrganizationId(9L, 41L)).thenReturn(Optional.of(version));
        when(runs.findByIdAndOrganizationId(50L, 41L)).thenReturn(Optional.of(run(version, 50L)));

        assertThrows(ResponseStatusException.class, () -> service.create(7L,
                new CreateSchemaReviewRequest(5L, 9L, List.of(50L), List.of(12L),
                        OffsetDateTime.now().minusDays(1))));
    }

    @Test
    void assignments_ListsOnlyEnabledMembersWithReviewPermission() {
        User reviewer = reviewer(12L, "Reviewer");
        OrganizationMembership membership = new OrganizationMembership(
                organization(), reviewer, OrganizationRole.MEMBER, MembershipStatus.ACTIVE);
        when(memberships.findByOrganizationIdAndStatusOrderByCreatedAtAsc(41L, MembershipStatus.ACTIVE))
                .thenReturn(List.of(membership));
        when(authorization.effectiveOrganizationPermissions(12L, 41L)).thenReturn(Set.of(PermissionKey.REVIEW));

        var candidates = assignmentService().eligibleReviewers(7L, 41L);

        assertEquals(List.of(12L), candidates.stream().map(candidate -> candidate.id()).toList());
        verify(authorization).requireReviewManagement(7L, 41L);
    }

    @Test
    void assignments_RejectsMemberWithoutReviewPermission() {
        User reviewer = reviewer(12L, "Member");
        Organization organization = organization();
        OrganizationMembership membership = new OrganizationMembership(
                organization, reviewer, OrganizationRole.MEMBER, MembershipStatus.ACTIVE);
        when(memberships.findByOrganizationIdAndStatusOrderByCreatedAtAsc(41L, MembershipStatus.ACTIVE))
                .thenReturn(List.of(membership));
        when(authorization.effectiveOrganizationPermissions(12L, 41L)).thenReturn(Set.of(PermissionKey.VIEW_WORKSPACE));
        Schema schema = new Schema(organization, "Risk", null);
        SchemaReview review = new SchemaReview(organization, schema, version(schema, 9L), user(),
                OffsetDateTime.now().plusDays(1));

        assertThrows(ResponseStatusException.class, () -> assignmentService().assign(review, List.of(12L)));
    }

    @Test
    void detail_RejectsReviewOutsideCurrentOrganization() {
        when(workspaceAccess.requireCurrentOrganization(7L)).thenReturn(organization());
        when(reviewRepository.findByPublicIdAndOrganizationId("missing", 41L)).thenReturn(Optional.empty());

        assertThrows(SchemaReviewUnavailableException.class, () -> service.detail(7L, "missing", "run"));
    }

    @Test
    void detail_RejectsReviewerWhoWasNotAssigned() {
        SchemaReview review = review();
        when(workspaceAccess.requireCurrentOrganization(7L)).thenReturn(organization());
        when(reviewRepository.findByPublicIdAndOrganizationId(review.getPublicId(), 41L))
                .thenReturn(Optional.of(review));
        when(assignments.isAssigned(88L, 7L)).thenReturn(false);

        assertThrows(SchemaReviewUnavailableException.class,
                () -> service.detail(7L, review.getPublicId(), "run"));
    }

    @Test
    void inbox_ReturnsOnlyOpenReviewsAssignedToCurrentReviewer() {
        SchemaReview assigned = review();
        SchemaReview unassigned = review();
        unassigned.setId(89L);
        SchemaReview expired = review();
        expired.setId(90L);
        expired.setExpiresAt(OffsetDateTime.now().minusMinutes(1));
        when(workspaceAccess.requireCurrentOrganization(7L)).thenReturn(organization());
        when(reviewRepository.findByOrganizationIdOrderByCreatedAtDesc(41L))
                .thenReturn(List.of(assigned, unassigned, expired));
        when(assignments.isAssigned(88L, 7L)).thenReturn(true);
        when(assignments.isAssigned(89L, 7L)).thenReturn(false);

        var inbox = service.inbox(7L);

        assertEquals(List.of(assigned.getPublicId()), inbox.stream().map(item -> item.publicId()).toList());
        verify(authorization).requireReviewAccess(7L, 41L);
    }

    private PredictionRun run(SchemaVersion version, Long id) {
        PredictionRun run = new PredictionRun(version, "case", Map.of(), PredictionRunStatus.SUCCESS);
        run.setId(id);
        return run;
    }

    private void stubCreateActor() {
        when(workspaceAccess.requireCurrentOrganization(7L)).thenReturn(organization());
    }

    private SchemaReviewAssignmentService assignmentService() {
        return new SchemaReviewAssignmentService(memberships, assigneeRepository, authorization);
    }

    private SchemaReview review() {
        Schema schema = schema();
        SchemaReview review = new SchemaReview(organization(), schema, version(schema, 9L), user(),
                OffsetDateTime.now().plusDays(1));
        review.setId(88L);
        return review;
    }

    private User reviewer(Long id, String name) {
        User user = user();
        user.setId(id);
        user.setFullName(name);
        user.setEnabled(true);
        return user;
    }

    private SchemaVersion version(Schema schema, Long id) {
        SchemaVersion version = new SchemaVersion(schema, 1, "v1", Map.of("fields", List.of()));
        version.setId(id);
        return version;
    }

    private Schema schema() {
        Schema schema = new Schema(organization(), "Risk", null);
        schema.setId(5L);
        return schema;
    }

    private Organization organization() {
        Organization organization = new Organization();
        organization.setId(41L);
        organization.setName("Org");
        organization.setSlug("org");
        organization.setCreatedBy(user());
        return organization;
    }

    private User user() {
        User user = new User();
        user.setId(7L);
        user.setUsername("alice");
        user.setEmail("alice@example.com");
        return user;
    }
}
