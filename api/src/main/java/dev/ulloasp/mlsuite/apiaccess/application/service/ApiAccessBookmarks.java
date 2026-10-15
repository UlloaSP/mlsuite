package dev.ulloasp.mlsuite.apiaccess.application.service;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository.ApiClientRepository;
import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiAccessBookmarkDto;
import dev.ulloasp.mlsuite.schema.application.service.BookmarkPublishability;
import dev.ulloasp.mlsuite.schema.domain.model.BoundModel;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import lombok.RequiredArgsConstructor;

/**
 * Bookmarks as the client API sees them, with the one rule for whether clients can run one now:
 * its schema is not archived, its snapshot binds exactly one model, and that model fits the
 * size limit of runs made from outside the workspace. The reason names workspace models, so it
 * is for members only.
 */
@Component
@RequiredArgsConstructor
class ApiAccessBookmarks {

    private final BookmarkPublishability publishability;
    private final ApiClientRepository clientRepository;

    /** The bookmarks with the names of the organization's clients that may run each one. */
    List<ApiAccessBookmarkDto> describe(Long organizationId, Collection<SchemaBookmark> bookmarks) {
        Map<Long, List<String>> clients = new LinkedHashMap<>();
        for (Object[] row : clientRepository.findClientNamesByBookmark(organizationId)) {
            clients.computeIfAbsent((Long) row[0], id -> new ArrayList<>()).add((String) row[1]);
        }
        Map<Long, List<BoundModel>> models = publishability.models(
                bookmarks.stream().map(SchemaBookmark::getVersion).distinct().toList());
        return bookmarks.stream().map(bookmark -> {
            List<BoundModel> bound = models.getOrDefault(bookmark.getVersion().getId(), List.of());
            BoundModel model = bound.size() == 1 ? bound.get(0) : null;
            return new ApiAccessBookmarkDto(bookmark.getId(), bookmark.getPublicId(), bookmark.getName(),
                    bookmark.getSchema().getId(), bookmark.getSchema().getName(), bookmark.getVersion().getVersion(),
                    bookmark.getVersion().getName(), bookmark.getVisibility(),
                    model == null ? null : model.id(), model == null ? null : model.name(),
                    refusal(bookmark, bound), clients.getOrDefault(bookmark.getId(), List.of()));
        }).toList();
    }

    private String refusal(SchemaBookmark bookmark, List<BoundModel> models) {
        if (bookmark.getSchema().getArchivedAt() != null) return "Its schema is archived.";
        if (models.size() != 1) {
            return "Its snapshot binds %d models; clients run a bookmark of exactly one model.".formatted(models.size());
        }
        return publishability.refusal(models).orElse(null);
    }
}
