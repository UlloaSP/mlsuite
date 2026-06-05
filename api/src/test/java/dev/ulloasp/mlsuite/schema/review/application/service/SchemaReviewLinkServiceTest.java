package dev.ulloasp.mlsuite.schema.review.application.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;
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
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewLinkRepository;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewLinkRunRepository;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewLinkRunSubmissionRepository;
import dev.ulloasp.mlsuite.schema.review.application.dto.CreateSchemaReviewLinkRequest;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewLink;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@ExtendWith(MockitoExtension.class)
class SchemaReviewLinkServiceTest {
    @Mock private SchemaReviewLinkRepository linkRepository;
    @Mock private SchemaReviewLinkRunRepository linkRunRepository;
    @Mock private SchemaReviewLinkRunSubmissionRepository submissionRepository;
    @Mock private SchemaReviewLinkTokenService tokenService;
    @Mock private WorkspaceAccessService workspaceAccessService;
    @Mock private WorkspaceAuthorizationService authorizationService;
    @Mock private UserLookupService userLookupService;
    @Mock private SchemaRepository schemaRepository;
    @Mock private SchemaVersionRepository versionRepository;
    @Mock private SchemaModelBindingRepository bindingRepository;
    @Mock private PredictionRunRepository runRepository;
    @Mock private PredictionResultRepository resultRepository;
    @Mock private PredictionResultFeedbackRepository feedbackRepository;
    private SchemaReviewLinkService service;

    @BeforeEach
    void setUp() {
        service = new SchemaReviewLinkService(linkRepository, linkRunRepository, submissionRepository,
                tokenService, workspaceAccessService, authorizationService, userLookupService,
                schemaRepository, versionRepository, bindingRepository, runRepository,
                resultRepository, feedbackRepository);
        when(userLookupService.requireById(7L)).thenReturn(user());
        when(workspaceAccessService.requireCurrentOrganization(7L)).thenReturn(organization());
    }

    @Test
    void create_SavesOrganizationScopedSchemaReviewLink() {
        Schema schema = schema();
        SchemaVersion version = version(schema, 9L);
        PredictionRun run = run(version, 50L);
        when(schemaRepository.findByIdAndOrganizationId(5L, 41L)).thenReturn(Optional.of(schema));
        when(versionRepository.findByIdAndOrganizationId(9L, 41L)).thenReturn(Optional.of(version));
        when(runRepository.findByIdAndOrganizationId(50L, 41L)).thenReturn(Optional.of(run));
        when(linkRepository.save(any(SchemaReviewLink.class))).thenAnswer(invocation -> {
            SchemaReviewLink link = invocation.getArgument(0);
            link.setId(88L);
            return link;
        });
        when(tokenService.encrypt(any(SchemaReviewLinkTokenPayload.class))).thenReturn("token");
        when(tokenService.hash("token")).thenReturn("hash");

        var response = service.create(7L,
                new CreateSchemaReviewLinkRequest(5L, 9L, List.of(50L), null),
                "http://localhost:5173");

        assertEquals("http://localhost:5173/schema-review/token", response.url());
        assertEquals(1, response.runCount());
        verify(authorizationService).requireReviewLinkManagement(7L, 41L);
        verify(linkRunRepository).save(any());
    }

    @Test
    void create_RejectsRunOutsideSchemaVersion() {
        Schema schema = schema();
        SchemaVersion version = version(schema, 9L);
        PredictionRun wrongRun = run(version(schema, 10L), 50L);
        when(schemaRepository.findByIdAndOrganizationId(5L, 41L)).thenReturn(Optional.of(schema));
        when(versionRepository.findByIdAndOrganizationId(9L, 41L)).thenReturn(Optional.of(version));
        when(runRepository.findByIdAndOrganizationId(50L, 41L)).thenReturn(Optional.of(wrongRun));

        assertThrows(ResponseStatusException.class, () -> service.create(7L,
                new CreateSchemaReviewLinkRequest(5L, 9L, List.of(50L), null), null));
    }

    private PredictionRun run(SchemaVersion version, Long id) {
        PredictionRun run = new PredictionRun(version, "case", Map.of(), PredictionRunStatus.SUCCESS);
        run.setId(id);
        return run;
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
