package dev.ulloasp.mlsuite.schema.application.service;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

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

        return bookmarks.stream().map(bookmark -> {
            Schema schema = bookmark.getSchema();
            SchemaVersion version = bookmark.getVersion();
            BookmarkRunStats stats = runs.get(bookmark.getId());
            return new PredictBookmarkDto(
                    bookmark.getId(),
                    bookmark.getName(),
                    schema.getId(),
                    schema.getName(),
                    schema.getDescription(),
                    version.getId(),
                    version.getVersion(),
                    version.getName(),
                    latest.getOrDefault(schema.getId(), version.getVersion()),
                    models.getOrDefault(version.getId(), List.of()),
                    count(version.getFormSchema(), "fields"),
                    count(version.getFormSchema(), "reports"),
                    stats == null ? 0 : stats.getRunCount(),
                    stats == null ? null : stats.getLastRunAt(),
                    bookmark.getUpdatedAt());
        }).toList();
    }

    private int count(Map<String, Object> formSchema, String key) {
        return formSchema != null && formSchema.get(key) instanceof List<?> items ? items.size() : 0;
    }
}
