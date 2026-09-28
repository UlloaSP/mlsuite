package dev.ulloasp.mlsuite.schema;

import static dev.ulloasp.mlsuite.schema.SchemaFlowFixtures.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.node.JsonNodeFactory;

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultFeedbackRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaDraftRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaVersionRepository;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewRepository;
import dev.ulloasp.mlsuite.schema.application.dto.CreatePredictionResultFeedbackRequest;
import dev.ulloasp.mlsuite.schema.application.dto.CreatePredictionRunRequest;
import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaModelBindingRequest;
import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaRequest;
import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaVersionRequest;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaCatalogItemDto;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.schema.application.service.PredictionRunServiceImpl;
import dev.ulloasp.mlsuite.schema.application.service.PredictionResultFeedbackService;
import dev.ulloasp.mlsuite.schema.application.service.SchemaServiceImpl;
import dev.ulloasp.mlsuite.schema.application.service.SchemaVersionServiceImpl;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResult;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedback;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedbackType;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultStatus;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunStatus;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaModelBinding;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@ExtendWith(MockitoExtension.class)
class SchemaFlowServiceTest {

    @Mock private UserLookupService userLookupService;
    @Mock private SchemaRepository schemaRepository;
    @Mock private SchemaVersionRepository versionRepository;
    @Mock private SchemaBookmarkRepository bookmarkRepository;
    @Mock private SchemaModelBindingRepository bindingRepository;
    @Mock private PredictionRunRepository runRepository;
    @Mock private PredictionResultRepository resultRepository;
    @Mock private PredictionResultFeedbackRepository feedbackRepository;
    @Mock private SchemaReviewRepository reviewRepository;
    @Mock private ModelRepository modelRepository;
    @Mock private WorkspaceAuthorizationService authorizationService;

    private SchemaServiceImpl schemaService;
    private SchemaVersionServiceImpl versionService;
    private PredictionRunServiceImpl runService;
    private PredictionResultFeedbackService feedbackService;

    @BeforeEach
    void setUp() {
        schemaService = new SchemaServiceImpl(userLookupService, schemaRepository, versionRepository,
                bindingRepository, runRepository, reviewRepository,
                authorizationService, mock(SchemaDraftRepository.class), mock(SchemaBookmarkRepository.class));
        versionService = new SchemaVersionServiceImpl(userLookupService, schemaRepository, versionRepository,
                bindingRepository, modelRepository, mock(SchemaDraftRepository.class), authorizationService);
        runService = new PredictionRunServiceImpl(userLookupService, bookmarkRepository, bindingRepository,
                runRepository, resultRepository, feedbackRepository, modelRepository, authorizationService);
        feedbackService = new PredictionResultFeedbackService(
                userLookupService, authorizationService, resultRepository, feedbackRepository, runRepository);
        lenient().when(userLookupService.requireById(7L)).thenReturn(user());
        lenient().when(authorizationService.requireCurrent(eq(7L), any(PermissionKey[].class))).thenReturn(organization());
    }

    @Test
    void createSchema_SavesOrganizationScopedSchema() {
        when(schemaRepository.save(any(Schema.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Schema result = schemaService.createSchema(7L, new CreateSchemaRequest("Risk", "Transplant risk"));

        assertEquals("Risk", result.getName());
        assertEquals("Transplant risk", result.getDescription());
        assertEquals(7L, result.getUpdatedBy().getId());
        assertEquals(41L, result.getOrganization().getId());
        verify(authorizationService).requireCurrent(7L, PermissionKey.CREATE_MODELS);
    }

    @Test
    void getSchemaPage_ReturnsPagedSchemas() {
        when(schemaRepository.findCatalogPage(any(), any(), any(Boolean.class), any(Boolean.class), any()))
                .thenReturn(new PageImpl<>(List.of(schema()), PageRequest.of(0, 24), 1));
        when(versionRepository.findTopBySchemaIdOrderByVersionDesc(5L)).thenReturn(Optional.of(version()));
        when(bindingRepository.countBySchemaVersionId(9L)).thenReturn(2L);

        PageDto<SchemaCatalogItemDto> page = schemaService.getSchemaPage(7L, 0, 24, "risk", "updated", "active");

        assertEquals(1, page.totalItems());
        assertEquals("Risk", page.items().get(0).name());
        assertEquals(2L, page.items().get(0).modelCount());
        assertEquals(1L, page.items().get(0).fieldCount());
        assertEquals("Alice", page.items().get(0).updatedByName());
        verify(authorizationService).requireCurrent(7L, PermissionKey.VIEW_MODELS);
    }

    @Test
    void renameSchema_RejectsDuplicateName() {
        when(schemaRepository.findByIdAndOrganizationId(5L, 41L)).thenReturn(Optional.of(schema()));
        when(schemaRepository.existsByNameAndOrganizationIdAndIdNot("Risk 2", 41L, 5L)).thenReturn(true);

        assertThrows(ResponseStatusException.class, () -> schemaService.renameSchema(7L, 5L, "Risk 2"));
    }

    @Test
    void archiveSchema_SetsArchivedAt() {
        Schema schema = schema();
        when(schemaRepository.findByIdAndOrganizationId(5L, 41L)).thenReturn(Optional.of(schema));
        when(schemaRepository.save(any(Schema.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Schema result = schemaService.archiveSchema(7L, 5L);

        assertEquals(5L, result.getId());
        assertNotNull(result.getArchivedAt());
    }

    @Test
    void deleteSchema_RejectsSchemaWithRuns() {
        when(schemaRepository.findByIdAndOrganizationId(5L, 41L)).thenReturn(Optional.of(schema()));
        when(runRepository.existsBySchemaId(5L)).thenReturn(true);

        assertThrows(ResponseStatusException.class, () -> schemaService.deleteSchema(7L, 5L));
    }

    @Test
    void createVersion_RejectsDuplicateModelBinding() {
        when(schemaRepository.findForUpdate(5L, 41L)).thenReturn(Optional.of(schema()));

        CreateSchemaVersionRequest request = new CreateSchemaVersionRequest("v1", formSchema(),
                List.of(new CreateSchemaModelBindingRequest(11L, Map.of()),
                        new CreateSchemaModelBindingRequest(11L, Map.of())));

        assertThrows(ResponseStatusException.class, () -> versionService.createVersion(7L, 5L, request));
    }

    @Test
    void createVersion_PersistsMultipleModelBindings() {
        when(schemaRepository.findForUpdate(5L, 41L)).thenReturn(Optional.of(schema()));
        when(versionRepository.findMaxVersionBySchemaId(5L)).thenReturn(0);
        when(versionRepository.save(any(SchemaVersion.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(bindingRepository.save(any(SchemaModelBinding.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(modelRepository.findByIdAndOrganizationId(11L, 41L)).thenReturn(Optional.of(model(11L)));
        when(modelRepository.findByIdAndOrganizationId(12L, 41L)).thenReturn(Optional.of(model(12L)));

        SchemaVersion version = versionService.createVersion(7L, 5L,
                new CreateSchemaVersionRequest("v1", formSchema(),
                        List.of(new CreateSchemaModelBindingRequest(11L, Map.of()),
                                new CreateSchemaModelBindingRequest(12L, Map.of()))));

        assertEquals("v1", version.getName());
        verify(bindingRepository, times(2)).save(any());
    }

    @Test
    void createVersion_RejectsEmptyModelBindings() {
        when(schemaRepository.findForUpdate(5L, 41L)).thenReturn(Optional.of(schema()));

        CreateSchemaVersionRequest request = new CreateSchemaVersionRequest("v1", formSchema(), List.of());

        assertThrows(ResponseStatusException.class, () -> versionService.createVersion(7L, 5L, request));
    }

    @Test
    void createRun_PersistsPartialSuccessWhenEachBindingHasAResult() {
        User creator = user();
        creator.setEmail("alice@example.com");
        lenient().when(userLookupService.requireById(7L)).thenReturn(creator);
        SchemaBookmark bookmark = bookmark();
        SchemaVersion version = bookmark.getVersion();
        when(bookmarkRepository.findByIdAndOrganizationId(70L, 41L)).thenReturn(Optional.of(bookmark));
        when(bindingRepository.findBySchemaVersionId(9L))
                .thenReturn(List.of(binding(version, 11L), binding(version, 12L)));
        when(runRepository.save(any(PredictionRun.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(modelRepository.findByIdAndOrganizationId(11L, 41L)).thenReturn(Optional.of(model(11L)));
        when(modelRepository.findByIdAndOrganizationId(12L, 41L)).thenReturn(Optional.of(model(12L)));

        PredictionRun run = runService.createRunForBookmark(7L, 70L,
                new CreatePredictionRunRequest(9L, "case-1", Map.of("age", 52),
                        List.of(result(11L, PredictionResultStatus.SUCCESS),
                                result(12L, PredictionResultStatus.FAILED))));

        assertEquals(PredictionRunStatus.PARTIAL_SUCCESS, run.getStatus());
        assertEquals("Alice", run.getCreatedByName());
        assertEquals("alice@example.com", run.getCreatedByEmail());
        creator.setFullName("Renamed later");
        assertEquals("Alice", run.getCreatedByName());
        var detail = dev.ulloasp.mlsuite.schema.application.dto.PredictionRunDto.from(run, List.of());
        var catalog = dev.ulloasp.mlsuite.schema.application.dto.PredictionRunCatalogItemDto.from(run);
        assertEquals(detail.createdByName(), catalog.createdByName());
        assertEquals("alice@example.com", catalog.createdByEmail());
        var legacy = new PredictionRun(version, "legacy", Map.of(), PredictionRunStatus.SUCCESS);
        org.junit.jupiter.api.Assertions.assertNull(
                dev.ulloasp.mlsuite.schema.application.dto.PredictionRunDto.from(legacy, List.of()).createdByName());
        org.junit.jupiter.api.Assertions.assertNull(
                dev.ulloasp.mlsuite.schema.application.dto.PredictionRunCatalogItemDto.from(legacy).createdByEmail());
        verify(resultRepository, times(2)).save(any());
    }

    @Test
    void createRun_RejectsSnapshotTheBookmarkNoLongerTargets() {
        when(bookmarkRepository.findByIdAndOrganizationId(70L, 41L)).thenReturn(Optional.of(bookmark()));
        CreatePredictionRunRequest request = new CreatePredictionRunRequest(8L, "case-1", Map.of("age", 52),
                List.of(result(11L, PredictionResultStatus.SUCCESS)));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> runService.createRunForBookmark(7L, 70L, request));

        assertEquals(409, error.getStatusCode().value());
        verify(runRepository, times(0)).save(any());
    }

    @Test
    void createRun_RejectsUnboundResult() {
        SchemaBookmark bookmark = bookmark();
        SchemaVersion version = bookmark.getVersion();
        when(bookmarkRepository.findByIdAndOrganizationId(70L, 41L)).thenReturn(Optional.of(bookmark));
        when(bindingRepository.findBySchemaVersionId(9L)).thenReturn(List.of(binding(version, 11L)));

        CreatePredictionRunRequest request = new CreatePredictionRunRequest(9L, "case-1", Map.of("age", 52),
                List.of(result(12L, PredictionResultStatus.SUCCESS)));

        assertThrows(ResponseStatusException.class, () -> runService.createRunForBookmark(7L, 70L, request));
    }

    @Test
    void createRun_RejectsMissingBoundResult() {
        SchemaBookmark bookmark = bookmark();
        SchemaVersion version = bookmark.getVersion();
        when(bookmarkRepository.findByIdAndOrganizationId(70L, 41L)).thenReturn(Optional.of(bookmark));
        when(bindingRepository.findBySchemaVersionId(9L)).thenReturn(List.of(
                binding(version, 11L),
                binding(version, 12L)));

        CreatePredictionRunRequest request = new CreatePredictionRunRequest(9L, "case-1", Map.of("age", 52),
                List.of(result(11L, PredictionResultStatus.SUCCESS)));

        assertThrows(ResponseStatusException.class, () -> runService.createRunForBookmark(7L, 70L, request));
    }

    @Test
    void getLastPredictionRunId_ReturnsRepositoryMaxAfterOperateCheck() {
        when(runRepository.findLastPredictionRunId()).thenReturn(41L);

        assertEquals(41L, runService.getLastPredictionRunId(7L));
        verify(authorizationService).requireCurrent(7L, PermissionKey.RUN_PREDICTIONS);
    }

    @Test
    void createFeedback_UpsertsResultFeedback() {
        PredictionResult result = predictionResult();
        when(resultRepository.findByIdAndOrganizationId(77L, 41L)).thenReturn(Optional.of(result));
        when(feedbackRepository.findByResultIdAndUserIdAndTypeAndOrder(
                77L, 7L, PredictionResultFeedbackType.OUTPUT, 0)).thenReturn(Optional.empty());
        when(feedbackRepository.save(any(PredictionResultFeedback.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        PredictionResultFeedback feedback = feedbackService.create(7L,
                new CreatePredictionResultFeedbackRequest(77L, PredictionResultFeedbackType.OUTPUT, 0,
                        JsonNodeFactory.instance.objectNode().put("correct", true)));

        assertEquals(PredictionResultFeedbackType.OUTPUT, feedback.getType());
        assertEquals(77L, feedback.getResult().getId());
        verify(authorizationService).requireCurrent(7L, PermissionKey.VIEW_ORGANIZATION);
    }

    @Test
    void createFeedback_RejectsResultOutsideOrganization() {
        when(resultRepository.findByIdAndOrganizationId(77L, 41L)).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class, () -> feedbackService.create(7L,
                new CreatePredictionResultFeedbackRequest(77L, PredictionResultFeedbackType.OUTPUT, 0,
                        JsonNodeFactory.instance.objectNode())));
    }

}
