package dev.ulloasp.mlsuite.schema.application.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.application.service.PublicForm.ReportRoute;
import dev.ulloasp.mlsuite.schema.domain.model.BoundModel;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.model.application.runtime.RunnableModel;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import lombok.RequiredArgsConstructor;

/**
 * What a member's workspace prediction runs, decided in one short read: the member may run
 * predictions, the bookmark still targets the snapshot the form was built from, and the model is
 * one it binds. The plan holds values only, so the runtime is then called with no connection held.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class WorkspacePredictionPlanner {

    private final WorkspaceAuthorizationService authorizationService;
    private final SchemaBookmarkRepository bookmarkRepository;
    private final BookmarkPublishability publishability;
    private final ModelRepository modelRepository;

    /** One bound model's run for an organization's snapshot, with the snapshot's report routes. */
    public record Plan(Long organizationId, Long schemaVersionId, RunnableModel model,
            List<ReportRoute> routes) {

        public Long modelId() {
            return model.modelId();
        }

        /** A plugin report of this model is the runtime's explanation, asked for in the same run. */
        boolean explained() {
            return routes.stream().anyMatch(route -> route.modelId().equals(modelId()) && !route.assessed());
        }
    }

    /** The run of {@code modelId} for the bookmark, whose form was built from {@code schemaVersionId}. */
    public Plan plan(Long userId, Long bookmarkId, Long schemaVersionId, Long modelId) {
        Long organizationId = authorizationService.requireCurrent(userId, PermissionKey.RUN_PREDICTIONS).getId();
        return planFor(organizationId, bookmarkId, schemaVersionId, modelId);
    }

    /** The same run in a given organization, for work whose member was authorized when it started. */
    public Plan planFor(Long organizationId, Long bookmarkId, Long schemaVersionId, Long modelId) {
        SchemaBookmark bookmark = bookmarkRepository.findByIdAndOrganizationId(bookmarkId, organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema bookmark not found"));
        SchemaVersion version = bookmark.getVersion();
        if (!version.getId().equals(schemaVersionId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "The bookmark moved to another snapshot; reload before running");
        }
        List<BoundModel> models = publishability.models(version);
        if (models.stream().noneMatch(model -> model.id().equals(modelId))) throw notBound();
        RunnableModel model = modelRepository.findRunnableModel(modelId, organizationId)
                .orElseThrow(WorkspacePredictionPlanner::notBound);
        return new Plan(organizationId, version.getId(), model,
                PublicForm.of(version.getFormSchema(), models).reportRoutes());
    }

    private static ResponseStatusException notBound() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "The model is not bound to this snapshot");
    }
}
