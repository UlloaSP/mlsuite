package dev.ulloasp.mlsuite.schema.application.service;

import java.util.List;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository.BookmarkRunStats;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaVersionRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaVersionRepository.LatestSchemaVersion;
import dev.ulloasp.mlsuite.schema.application.dto.PredictBookmarkDto;
import dev.ulloasp.mlsuite.schema.application.port.in.PredictBookmarkCatalogUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.util.CatalogPages;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

/** The organization's bookmarks, ready to run, with what they run and how much they are used. */
@Service
@Transactional
@RequiredArgsConstructor
public class PredictBookmarkCatalogService implements PredictBookmarkCatalogUseCase {

    private final WorkspaceAuthorizationService authorizationService;
    private final SchemaBookmarkRepository bookmarkRepository;
    private final SchemaVersionRepository versionRepository;
    private final SchemaModelBindingRepository bindingRepository;
    private final PredictionRunRepository runRepository;

    @Override
    public List<PredictBookmarkDto> listBookmarks(Long userId) {
        Long organizationId = authorizationService.requireCurrent(userId, PermissionKey.VIEW_MODELS).getId();

        List<SchemaBookmark> bookmarks = bookmarkRepository.findActiveByOrganizationId(organizationId);
        if (bookmarks.isEmpty()) return List.of();
        // One grouped query per aggregate instead of one per bookmark.
        Map<Long, BookmarkRunStats> runs = runRepository.findBookmarkRunStats(organizationId).stream()
                .collect(Collectors.toMap(BookmarkRunStats::getBookmarkId, Function.identity()));
        Map<Long, Integer> latest = versionRepository.findLatestVersions(organizationId).stream()
                .collect(Collectors.toMap(LatestSchemaVersion::getSchemaId, LatestSchemaVersion::getLatestVersion));
        Set<Long> versionIds = bookmarks.stream().map(bookmark -> bookmark.getVersion().getId())
                .collect(Collectors.toSet());
        Map<Long, List<String>> models = bindingRepository.findBySchemaVersionIdIn(versionIds).stream()
                .collect(Collectors.groupingBy(binding -> binding.getSchemaVersion().getId(),
                        Collectors.mapping(binding -> binding.getModel().getName(), Collectors.toList())));

        return bookmarks.stream()
                .map(bookmark -> dto(bookmark, runs.get(bookmark.getId()),
                        latest.getOrDefault(bookmark.getSchema().getId(), bookmark.getVersion().getVersion()),
                        models.getOrDefault(bookmark.getVersion().getId(), List.of())))
                .toList();
    }

    @Override
    public PageDto<PredictBookmarkDto> catalog(Long userId, CatalogRequest request) {
        Long organizationId = authorizationService.requireCurrent(userId, PermissionKey.VIEW_MODELS).getId();
        var page = bookmarkRepository.findPredictCatalog(organizationId, CatalogPages.likeLiteral(request.search()),
                request.filter(), request.sort(), CatalogPages.pageable(request, Sort.unsorted()));
        var bookmarks = bookmarkRepository.findAllById(page.getContent().stream().map(item -> item.getId()).toList())
                .stream().collect(Collectors.toMap(SchemaBookmark::getId, Function.identity()));
        Set<Long> versionIds = bookmarks.values().stream().map(bookmark -> bookmark.getVersion().getId())
                .collect(Collectors.toSet());
        Map<Long, List<String>> models = versionIds.isEmpty() ? Map.of()
                : bindingRepository.findBySchemaVersionIdIn(versionIds).stream()
                        .collect(Collectors.groupingBy(binding -> binding.getSchemaVersion().getId(),
                                Collectors.mapping(binding -> binding.getModel().getName(), Collectors.toList())));
        return PageDto.of(page, page.getContent().stream().map(item -> {
            SchemaBookmark bookmark = bookmarks.get(item.getId());
            return dto(bookmark, item.getRunCount(), item.getLastRunAt(), item.getLatestVersion(),
                    models.getOrDefault(bookmark.getVersion().getId(), List.of()));
        }).toList());
    }

    @Override
    public PredictBookmarkDto bookmark(Long userId, Long bookmarkId) {
        Long organizationId = authorizationService.requireCurrent(userId, PermissionKey.VIEW_MODELS).getId();
        SchemaBookmark bookmark = bookmarkRepository.findActiveByIdAndOrganizationId(bookmarkId, organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema bookmark not found"));
        List<String> models = bindingRepository.findBySchemaVersionId(bookmark.getVersion().getId()).stream()
                .map(binding -> binding.getModel().getName())
                .toList();
        return dto(bookmark, runRepository.findRunStatsByBookmarkId(bookmarkId).orElse(null),
                versionRepository.findMaxVersionBySchemaId(bookmark.getSchema().getId()), models);
    }

    private PredictBookmarkDto dto(SchemaBookmark bookmark, BookmarkRunStats stats, int latestVersion,
            List<String> models) {
        return dto(bookmark, stats == null ? 0 : stats.getRunCount(), stats == null ? null : stats.getLastRunAt(),
                latestVersion, models);
    }

    private PredictBookmarkDto dto(SchemaBookmark bookmark, long runCount, OffsetDateTime lastRunAt,
            int latestVersion, List<String> models) {
        Schema schema = bookmark.getSchema();
        SchemaVersion version = bookmark.getVersion();
        return new PredictBookmarkDto(
                bookmark.getId(),
                bookmark.getName(),
                schema.getId(),
                schema.getName(),
                schema.getDescription(),
                version.getId(),
                version.getVersion(),
                version.getName(),
                latestVersion,
                models,
                count(version.getFormSchema(), "fields"),
                count(version.getFormSchema(), "reports"),
                runCount,
                lastRunAt,
                bookmark.getUpdatedAt());
    }

    private int count(Map<String, Object> formSchema, String key) {
        return formSchema != null && formSchema.get(key) instanceof List<?> items ? items.size() : 0;
    }
}
