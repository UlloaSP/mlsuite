package dev.ulloasp.mlsuite.schema.catalog;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Consumer;
import java.util.function.Function;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.schema.application.dto.InferenceTableDto;
import dev.ulloasp.mlsuite.schema.application.dto.InferenceTableRunDto;
import dev.ulloasp.mlsuite.schema.application.dto.PredictionRunCatalogItemDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaVersionDto;
import dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogMetadataDto.Option;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import lombok.RequiredArgsConstructor;

/**
 * Reads the current organization's inferences for a member allowed to see them. Payloads arrive in
 * batches, each a complete table of its own, so a derived filter or sort never needs every run,
 * result and answer of the organization in memory at once.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class InferenceCatalogReader {

    /** The runs of one batch, and the most ids any single statement binds. */
    static final int BATCH_SIZE = 100;

    private final WorkspaceAuthorizationService authorization;
    private final InferenceCatalogQueries queries;

    /** The organization's run count and the schemas and bookmarks its runs can be filtered by. */
    public record Choices(long totalItems, List<Option> schemas, List<Option> bookmarks) {
    }

    /**
     * One page of a scope in creation order, which the database can page by itself.
     *
     * @return how many runs the scope holds
     */
    public long page(Long userId, InferenceCatalogScope scope, boolean oldestFirst, int page, int size,
            Consumer<InferenceTableDto> consume) {
        Long organizationId = organization(userId);
        long total = queries.count(organizationId, scope);
        long offset = (long) page * size;
        if (offset < total && offset <= Integer.MAX_VALUE) {
            deliver(organizationId, queries.ids(organizationId, scope, oldestFirst, (int) offset, size), consume);
        }
        return total;
    }

    /** Every run of a scope, newest first. The ids are sorted once; payloads follow in batches. */
    public void scan(Long userId, InferenceCatalogScope scope, Consumer<InferenceTableDto> consume) {
        Long organizationId = organization(userId);
        deliver(organizationId, queries.ids(organizationId, scope), consume);
    }

    /** The given runs of the organization, in the given order; one that is not there is left out. */
    public void selected(Long userId, List<Long> ids, Consumer<InferenceTableDto> consume) {
        deliver(organization(userId), ids, consume);
    }

    /** The summaries of exactly the given runs, in the given order. */
    public List<PredictionRunCatalogItemDto> summaries(Long userId, List<Long> selectedIds) {
        Long organizationId = organization(userId);
        List<Long> ids = selectedIds.stream().distinct().toList();
        List<PredictionRunCatalogItemDto> summaries = new ArrayList<>();
        for (List<Long> batch : batches(ids)) {
            List<PredictionRunCatalogItemDto> found = inOrder(
                    queries.summaries(organizationId, batch), PredictionRunCatalogItemDto::id, batch);
            if (found.size() != batch.size()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Selected inference not found");
            }
            summaries.addAll(found);
        }
        return summaries;
    }

    /**
     * @param bookmarkScope the runs whose bookmarks can be chosen; schemas are always the organization's
     */
    public Choices choices(Long userId, InferenceCatalogScope bookmarkScope) {
        Long organizationId = organization(userId);
        return new Choices(
                queries.count(organizationId, InferenceCatalogScope.organization()),
                queries.schemas(organizationId),
                queries.bookmarks(organizationId, bookmarkScope));
    }

    private void deliver(Long organizationId, List<Long> ids, Consumer<InferenceTableDto> consume) {
        // Snapshots are few and shared by many runs, so each is read once for the whole read, not per batch.
        Map<Long, SchemaVersionDto> versions = new HashMap<>();
        for (List<Long> batch : batches(ids)) {
            List<InferenceTableRunDto> runs = inOrder(
                    queries.runs(organizationId, batch), run -> run.summary().id(), batch);
            if (runs.isEmpty()) {
                continue;
            }
            List<Long> runIds = runs.stream().map(run -> run.summary().id()).toList();
            Set<Long> versionIds = new LinkedHashSet<>();
            runs.forEach(run -> versionIds.add(run.summary().schemaVersionId()));
            List<Long> unread = versionIds.stream().filter(id -> !versions.containsKey(id)).toList();
            if (!unread.isEmpty()) {
                queries.versions(unread).forEach(version -> versions.put(version.id(), version));
            }
            consume.accept(new InferenceTableDto(runs, queries.results(runIds), queries.feedback(runIds),
                    versionIds.stream().map(versions::get).filter(Objects::nonNull).toList()));
        }
    }

    private static List<List<Long>> batches(List<Long> ids) {
        List<List<Long>> batches = new ArrayList<>();
        for (int from = 0; from < ids.size(); from += BATCH_SIZE) {
            batches.add(ids.subList(from, Math.min(from + BATCH_SIZE, ids.size())));
        }
        return batches;
    }

    private static <T> List<T> inOrder(List<T> found, Function<T, Long> id, List<Long> order) {
        Map<Long, T> byId = new HashMap<>();
        found.forEach(item -> byId.put(id.apply(item), item));
        return order.stream().map(byId::get).filter(Objects::nonNull).toList();
    }

    private Long organization(Long userId) {
        return authorization.requireCurrent(userId, PermissionKey.VIEW_MODELS).getId();
    }
}
