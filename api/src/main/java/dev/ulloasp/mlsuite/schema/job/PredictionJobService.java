package dev.ulloasp.mlsuite.schema.job;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

/**
 * Bulk jobs as members see them: started with the rows of an upload, listed with their progress,
 * cancelled, and their failed rows run again. Starting or changing a job takes the right to run
 * predictions in the organization; reading jobs, the right to see its models. A job holds at most
 * {@code max-rows} rows, and an organization and each of its members have a bounded number open.
 */
@Service
@Transactional
public class PredictionJobService {

    private static final int LISTED = 50;

    private final PredictionJobLedger ledger;
    private final PredictionJobOutcomes outcomes;
    private final UserLookupService users;
    private final WorkspaceAuthorizationService authorization;
    private final SchemaBookmarkRepository bookmarks;
    private final SchemaModelBindingRepository bindings;
    private final int maxRows;
    private final int maxOpenPerOrganization;
    private final int maxOpenPerMember;

    PredictionJobService(PredictionJobLedger ledger, PredictionJobOutcomes outcomes, UserLookupService users,
            WorkspaceAuthorizationService authorization, SchemaBookmarkRepository bookmarks,
            SchemaModelBindingRepository bindings,
            @Value("${mlsuite.prediction-jobs.max-rows}") int maxRows,
            @Value("${mlsuite.prediction-jobs.max-open-per-organization}") int maxOpenPerOrganization,
            @Value("${mlsuite.prediction-jobs.max-open-per-member}") int maxOpenPerMember) {
        this.ledger = ledger;
        this.outcomes = outcomes;
        this.users = users;
        this.authorization = authorization;
        this.bookmarks = bookmarks;
        this.bindings = bindings;
        this.maxRows = maxRows;
        this.maxOpenPerOrganization = maxOpenPerOrganization;
        this.maxOpenPerMember = maxOpenPerMember;
    }

    public PredictionJobDto start(Long userId, Long bookmarkId, CreatePredictionJobRequest request) {
        Long organizationId = authorization.requireCurrent(userId, PermissionKey.RUN_PREDICTIONS).getId();
        SchemaBookmark bookmark = bookmarks.findByIdAndOrganizationId(bookmarkId, organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema bookmark not found"));
        if (!bookmark.getVersion().getId().equals(request.schemaVersionId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "The bookmark moved to another snapshot; reload before running");
        }
        if (request.rows().size() > maxRows) {
            throw badRequest("A bulk upload holds at most " + maxRows + " rows; split the file");
        }
        requireRowsFor(bookmark, request.rows());
        if (ledger.countOpenOf(organizationId, userId) >= maxOpenPerMember) {
            throw tooMany("You already have " + maxOpenPerMember + " bulk uploads running; wait for one to finish");
        }
        if (ledger.countOpen(organizationId) >= maxOpenPerOrganization) {
            throw tooMany("The organization already has " + maxOpenPerOrganization
                    + " bulk uploads running; wait for one to finish");
        }
        long id = ledger.insert(organizationId, bookmarkId, request.schemaVersionId(), userId, request.rows());
        return ledger.find(organizationId, id).orElseThrow();
    }

    @Transactional(readOnly = true)
    public List<PredictionJobDto> list(Long userId, Long bookmarkId) {
        return ledger.list(requireRead(userId), bookmarkId, LISTED);
    }

    @Transactional(readOnly = true)
    public PredictionJobDto get(Long userId, Long jobId) {
        return require(requireRead(userId), jobId);
    }

    @Transactional(readOnly = true)
    public List<PredictionJobFailureDto> failures(Long userId, Long jobId) {
        return ledger.failures(require(requireRead(userId), jobId).id());
    }

    public PredictionJobDto cancel(Long userId, Long jobId) {
        Long organizationId = requireRun(userId);
        PredictionJobDto job = require(organizationId, jobId);
        PredictionJobLedger.FinishedJob cancelled = ledger.cancel(organizationId, job.id())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "The bulk upload has already finished"));
        outcomes.cancelled(cancelled, userId, users.requireById(userId).getFullName());
        return require(organizationId, jobId);
    }

    public PredictionJobDto retry(Long userId, Long jobId) {
        Long organizationId = requireRun(userId);
        PredictionJobDto job = require(organizationId, jobId);
        if (job.failedRows() == 0 || !ledger.retry(organizationId, job.id())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only a finished bulk upload's failed rows run again");
        }
        return require(organizationId, jobId);
    }

    /** Each row is named once and gives records only to models the snapshot binds. */
    private void requireRowsFor(SchemaBookmark bookmark, List<CreatePredictionJobRequest.PredictionJobRow> rows) {
        Set<Long> bound = new HashSet<>();
        bindings.findBySchemaVersionId(bookmark.getVersion().getId()).forEach(b -> bound.add(b.getModel().getId()));
        Set<String> names = new HashSet<>();
        for (CreatePredictionJobRequest.PredictionJobRow row : rows) {
            if (!names.add(row.name())) throw badRequest("Two rows are named " + row.name());
            if (row.models().stream().anyMatch(model -> !bound.contains(model.modelId()))) {
                throw badRequest("A row gives a record to a model the snapshot does not bind");
            }
        }
    }

    private PredictionJobDto require(Long organizationId, Long jobId) {
        return ledger.find(organizationId, jobId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bulk upload not found"));
    }

    private Long requireRead(Long userId) {
        return authorization.requireCurrent(userId, PermissionKey.VIEW_MODELS).getId();
    }

    private Long requireRun(Long userId) {
        return authorization.requireCurrent(userId, PermissionKey.RUN_PREDICTIONS).getId();
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static ResponseStatusException tooMany(String message) {
        return new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, message);
    }
}
