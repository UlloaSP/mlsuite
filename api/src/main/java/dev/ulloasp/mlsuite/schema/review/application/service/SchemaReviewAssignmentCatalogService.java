package dev.ulloasp.mlsuite.schema.review.application.service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewAssignmentCatalogReader;
import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewAssignmentStatusDto;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import lombok.RequiredArgsConstructor;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class SchemaReviewAssignmentCatalogService {
    private final WorkspaceAuthorizationService authorization;
    private final PredictionRunRepository runs;
    private final SchemaReviewAssignmentCatalogReader assignments;

    public PageDto<SchemaReviewAssignmentStatusDto> page(Long userId, Long runId, CatalogRequest request) {
        Long organizationId = authorization.requireCurrent(userId, PermissionKey.MANAGE_REVIEWS).getId();
        runs.findByIdAndOrganizationId(runId, organizationId).orElseThrow(SchemaReviewUnavailableException::new);
        return assignments.page(runId, OffsetDateTime.now(ZoneOffset.UTC), request);
    }
}
