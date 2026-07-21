package dev.ulloasp.mlsuite.schema;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.schema.application.dto.CreatePredictionResultInitialFeedbackRequest;
import dev.ulloasp.mlsuite.schema.application.dto.CreatePredictionResultRequest;
import dev.ulloasp.mlsuite.schema.application.dto.CreatePredictionRunRequest;
import dev.ulloasp.mlsuite.schema.application.service.PredictionRunServiceImpl;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResult;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedback;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedbackType;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultStatus;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaModelBinding;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@ExtendWith(MockitoExtension.class)
class PredictionRunInitialFeedbackTest {

    @Mock private UserLookupService userLookupService;
    @Mock private SchemaBookmarkRepository bookmarkRepository;
    @Mock private SchemaModelBindingRepository bindingRepository;
    @Mock private PredictionRunRepository runRepository;
    @Mock private PredictionResultRepository resultRepository;
    @Mock private PredictionResultFeedbackRepository feedbackRepository;
    @Mock private ModelRepository modelRepository;
    @Mock private WorkspaceAccessService workspaceAccessService;
    @Mock private WorkspaceAuthorizationService authorizationService;
    private PredictionRunServiceImpl service;
    private SchemaBookmark bookmark;
    private Model model;

    @BeforeEach
    void setUp() {
        service = new PredictionRunServiceImpl(userLookupService, bookmarkRepository, bindingRepository,
                runRepository, resultRepository, feedbackRepository, modelRepository,
                workspaceAccessService, authorizationService);
        Organization organization = new Organization();
        organization.setId(41L);
        User user = new User();
        user.setId(7L);
        model = new Model();
        model.setId(11L);
        Schema schema = new Schema();
        schema.setOrganization(organization);
        SchemaVersion version = new SchemaVersion(schema, 1, "v1", Map.of("fields", List.of()));
        version.setId(9L);
        bookmark = new SchemaBookmark(schema, version, "main");
        bookmark.setId(70L);
        when(userLookupService.requireById(7L)).thenReturn(user);
        when(workspaceAccessService.requireCurrentOrganization(7L)).thenReturn(organization);
        when(bookmarkRepository.findByIdAndOrganizationId(70L, 41L)).thenReturn(Optional.of(bookmark));
        when(bindingRepository.findBySchemaVersionId(9L))
                .thenReturn(List.of(new SchemaModelBinding(version, model, Map.of())));
    }

    @Test
    void savesRunResultAndInitialFeedbackTogether() {
        when(runRepository.save(any(PredictionRun.class))).thenAnswer(call -> call.getArgument(0));
        when(modelRepository.findByIdAndOrganizationId(11L, 41L)).thenReturn(Optional.of(model));
        when(resultRepository.save(any(PredictionResult.class))).thenAnswer(call -> call.getArgument(0));
        service.createRunForBookmark(7L, 70L, request(List.of(feedback(0))));

        ArgumentCaptor<PredictionResultFeedback> captor = ArgumentCaptor.forClass(PredictionResultFeedback.class);
        verify(feedbackRepository).save(captor.capture());
        assertEquals(PredictionResultFeedbackType.OUTPUT, captor.getValue().getType());
        assertEquals(11L, captor.getValue().getResult().getModel().getId());
    }

    @Test
    void rejectsDuplicateFeedbackBeforePersistingRun() {
        CreatePredictionRunRequest request = request(List.of(feedback(0), feedback(0)));

        assertThrows(ResponseStatusException.class, () -> service.createRunForBookmark(7L, 70L, request));
        verify(runRepository, never()).save(any());
    }

    private CreatePredictionRunRequest request(List<CreatePredictionResultInitialFeedbackRequest> feedback) {
        return new CreatePredictionRunRequest("case-1", Map.of("age", 52), List.of(
                new CreatePredictionResultRequest(11L, Map.of("age", 52), Map.of("risk", 0.8),
                        PredictionResultStatus.SUCCESS, null, null, feedback)));
    }

    private CreatePredictionResultInitialFeedbackRequest feedback(int order) {
        return new CreatePredictionResultInitialFeedbackRequest(PredictionResultFeedbackType.OUTPUT, order,
                JsonNodeFactory.instance.objectNode().put("accepted", true));
    }
}
