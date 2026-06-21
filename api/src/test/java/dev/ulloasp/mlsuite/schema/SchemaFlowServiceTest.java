package dev.ulloasp.mlsuite.schema;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
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
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.node.JsonNodeFactory;

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultFeedbackRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaVersionRepository;
import dev.ulloasp.mlsuite.schema.application.dto.CreatePredictionResultRequest;
import dev.ulloasp.mlsuite.schema.application.dto.CreatePredictionResultFeedbackRequest;
import dev.ulloasp.mlsuite.schema.application.dto.CreatePredictionRunRequest;
import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaModelBindingRequest;
import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaRequest;
import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaVersionRequest;
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
import dev.ulloasp.mlsuite.schema.domain.model.SchemaModelBinding;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@ExtendWith(MockitoExtension.class)
class SchemaFlowServiceTest {

    @Mock
    private UserLookupService userLookupService;
    @Mock
    private SchemaRepository schemaRepository;
    @Mock
    private SchemaVersionRepository versionRepository;
    @Mock
    private SchemaModelBindingRepository bindingRepository;
    @Mock
    private PredictionRunRepository runRepository;
    @Mock
    private PredictionResultRepository resultRepository;
    @Mock
    private PredictionResultFeedbackRepository feedbackRepository;
    @Mock
    private ModelRepository modelRepository;
    @Mock
    private WorkspaceAccessService workspaceAccessService;
    @Mock
    private WorkspaceAuthorizationService authorizationService;

    private SchemaServiceImpl schemaService;
    private SchemaVersionServiceImpl versionService;
    private PredictionRunServiceImpl runService;
    private PredictionResultFeedbackService feedbackService;

    @BeforeEach
    void setUp() {
        schemaService = new SchemaServiceImpl(userLookupService, schemaRepository,
                workspaceAccessService, authorizationService);
        versionService = new SchemaVersionServiceImpl(userLookupService, schemaRepository, versionRepository,
                bindingRepository, modelRepository, workspaceAccessService, authorizationService);
        runService = new PredictionRunServiceImpl(userLookupService, versionRepository, bindingRepository,
                runRepository, resultRepository, modelRepository, workspaceAccessService, authorizationService);
        feedbackService = new PredictionResultFeedbackService(userLookupService, workspaceAccessService,
                authorizationService, resultRepository, feedbackRepository);
        when(userLookupService.requireById(7L)).thenReturn(user());
        when(workspaceAccessService.requireCurrentOrganization(7L)).thenReturn(organization());
    }

    @Test
    void createSchema_SavesOrganizationScopedSchema() {
        when(schemaRepository.save(any(Schema.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Schema result = schemaService.createSchema(7L, new CreateSchemaRequest("Risk", "Transplant risk"));

        assertEquals("Risk", result.getName());
        assertEquals(41L, result.getOrganization().getId());
        verify(authorizationService).requireOrganizationOperate(7L, 41L);
    }

    @Test
    void createVersion_RejectsDuplicateModelBinding() {
        when(schemaRepository.findByIdAndOrganizationId(5L, 41L)).thenReturn(Optional.of(schema()));

        CreateSchemaVersionRequest request = new CreateSchemaVersionRequest("v1", formSchema(),
                List.of(
                        new CreateSchemaModelBindingRequest(11L, Map.of()),
                        new CreateSchemaModelBindingRequest(11L, Map.of())));

        assertThrows(ResponseStatusException.class, () -> versionService.createVersion(7L, 5L, request));
    }

    @Test
    void createVersion_PersistsMultipleModelBindings() {
        when(schemaRepository.findByIdAndOrganizationId(5L, 41L)).thenReturn(Optional.of(schema()));
        when(versionRepository.findMaxVersionBySchemaId(5L)).thenReturn(0);
        when(versionRepository.save(any(SchemaVersion.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(bindingRepository.save(any(SchemaModelBinding.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(modelRepository.findByIdAndOrganizationId(11L, 41L)).thenReturn(Optional.of(model(11L)));
        when(modelRepository.findByIdAndOrganizationId(12L, 41L)).thenReturn(Optional.of(model(12L)));

        SchemaVersion version = versionService.createVersion(7L, 5L, new CreateSchemaVersionRequest("v1",
                formSchema(),
                List.of(
                        new CreateSchemaModelBindingRequest(11L, Map.of()),
                        new CreateSchemaModelBindingRequest(12L, Map.of()))));

        assertEquals("v1", version.getName());
        verify(bindingRepository, times(2)).save(any());
    }

    @Test
    void createVersion_RejectsEmptyModelBindings() {
        when(schemaRepository.findByIdAndOrganizationId(5L, 41L)).thenReturn(Optional.of(schema()));

        CreateSchemaVersionRequest request = new CreateSchemaVersionRequest("v1", formSchema(), List.of());

        assertThrows(ResponseStatusException.class, () -> versionService.createVersion(7L, 5L, request));
    }

    @Test
    void createRun_PersistsPartialSuccessWhenEachBindingHasAResult() {
        SchemaVersion version = version();
        when(versionRepository.findByIdAndOrganizationId(9L, 41L)).thenReturn(Optional.of(version));
        when(bindingRepository.findBySchemaVersionId(9L)).thenReturn(List.of(
                binding(version, 11L),
                binding(version, 12L)));
        when(runRepository.save(any(PredictionRun.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(modelRepository.findByIdAndOrganizationId(11L, 41L)).thenReturn(Optional.of(model(11L)));
        when(modelRepository.findByIdAndOrganizationId(12L, 41L)).thenReturn(Optional.of(model(12L)));

        PredictionRun run = runService.createRun(7L, 9L, new CreatePredictionRunRequest("case-1",
                Map.of("age", 52),
                List.of(
                        result(11L, PredictionResultStatus.SUCCESS),
                        result(12L, PredictionResultStatus.FAILED))));

        assertEquals(PredictionRunStatus.PARTIAL_SUCCESS, run.getStatus());
        verify(resultRepository, times(2)).save(any());
    }

    @Test
    void createRun_RejectsUnboundResult() {
        SchemaVersion version = version();
        when(versionRepository.findByIdAndOrganizationId(9L, 41L)).thenReturn(Optional.of(version));
        when(bindingRepository.findBySchemaVersionId(9L)).thenReturn(List.of(binding(version, 11L)));

        CreatePredictionRunRequest request = new CreatePredictionRunRequest("case-1", Map.of("age", 52),
                List.of(result(12L, PredictionResultStatus.SUCCESS)));

        assertThrows(ResponseStatusException.class, () -> runService.createRun(7L, 9L, request));
    }

    @Test
    void createRun_RejectsMissingBoundResult() {
        SchemaVersion version = version();
        when(versionRepository.findByIdAndOrganizationId(9L, 41L)).thenReturn(Optional.of(version));
        when(bindingRepository.findBySchemaVersionId(9L)).thenReturn(List.of(
                binding(version, 11L),
                binding(version, 12L)));

        CreatePredictionRunRequest request = new CreatePredictionRunRequest("case-1", Map.of("age", 52),
                List.of(result(11L, PredictionResultStatus.SUCCESS)));

        assertThrows(ResponseStatusException.class, () -> runService.createRun(7L, 9L, request));
    }

    @Test
    void getLastPredictionRunId_ReturnsRepositoryMaxAfterOperateCheck() {
        when(runRepository.findLastPredictionRunId()).thenReturn(41L);

        assertEquals(41L, runService.getLastPredictionRunId(7L));
        verify(authorizationService).requireOrganizationOperate(7L, 41L);
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
        verify(authorizationService).requireOrganizationRead(7L, 41L);
    }

    @Test
    void createFeedback_RejectsResultOutsideOrganization() {
        when(resultRepository.findByIdAndOrganizationId(77L, 41L)).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class, () -> feedbackService.create(7L,
                new CreatePredictionResultFeedbackRequest(77L, PredictionResultFeedbackType.OUTPUT, 0,
                        JsonNodeFactory.instance.objectNode())));
    }

    private CreatePredictionResultRequest result(Long modelId, PredictionResultStatus status) {
        return new CreatePredictionResultRequest(modelId, Map.of("age", 52),
                status == PredictionResultStatus.SUCCESS ? Map.of("reports", List.of()) : Map.of(),
                status,
                status == PredictionResultStatus.FAILED ? "failed" : null,
                status == PredictionResultStatus.FAILED ? Map.of("status", 500) : null);
    }

    private Map<String, Object> formSchema() {
        return Map.of("fields", List.of(Map.of("id", "age", "kind", "number", "label", "Age")));
    }

    private SchemaModelBinding binding(SchemaVersion version, Long modelId) {
        return new SchemaModelBinding(version, model(modelId), Map.of());
    }

    private SchemaVersion version() {
        SchemaVersion version = new SchemaVersion(schema(), 1, "v1", formSchema());
        version.setId(9L);
        return version;
    }

    private PredictionResult predictionResult() {
        PredictionRun run = new PredictionRun(version(), "case", Map.of(), PredictionRunStatus.SUCCESS);
        PredictionResult result = new PredictionResult(run, model(11L),
                Map.of(), Map.of(), PredictionResultStatus.SUCCESS, null, null);
        result.setId(77L);
        return result;
    }

    private Model model(Long id) {
        Model model = new Model();
        model.setId(id);
        model.setOrganization(organization());
        model.setUser(user());
        model.setName("model-" + id);
        return model;
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
        return user;
    }
}
