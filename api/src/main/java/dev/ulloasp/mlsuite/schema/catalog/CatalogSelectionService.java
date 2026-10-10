package dev.ulloasp.mlsuite.schema.catalog;

import java.time.DateTimeException;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.FormatStyle;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.schema.application.dto.PredictionRunCatalogItemDto;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import dev.ulloasp.mlsuite.util.CatalogPages;
import dev.ulloasp.mlsuite.util.PageDto;
import lombok.RequiredArgsConstructor;

/** The choices of a selection dialog: the selected runs, their snapshots or bookmarks, or reviewers. */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class CatalogSelectionService {

    private final InferenceCatalogReader runs;
    private final ReviewerSelectionCatalogQueries reviewers;
    private final WorkspaceAuthorizationService authorization;

    public CatalogSelectionPageDto page(Long userId, CatalogSelectionRequest request) {
        if ("reviewers".equals(request.kind())) {
            Long org = authorization.requireCurrent(userId, PermissionKey.MANAGE_REVIEWS).getId();
            return reviewers.page(org, request.catalog());
        }
        List<CatalogSelectionItemDto> all = available(userId, request);
        PageDto<CatalogSelectionItemDto> page = CatalogPages.page(matches(all, request), request.catalog());
        return new CatalogSelectionPageDto(
                page.items(), page.page(), page.size(), page.totalItems(), page.hasNext(), all.size());
    }

    public List<String> ids(Long userId, CatalogSelectionRequest request) {
        if ("reviewers".equals(request.kind())) {
            Long org = authorization.requireCurrent(userId, PermissionKey.MANAGE_REVIEWS).getId();
            return reviewers.ids(org, request.catalog());
        }
        return matches(available(userId, request), request).stream().map(CatalogSelectionItemDto::id).toList();
    }

    private List<CatalogSelectionItemDto> available(Long userId, CatalogSelectionRequest request) {
        return switch (request.kind() == null ? "" : request.kind()) {
            case "runs" -> runItems(runs.summaries(userId, request.ids()), request);
            case "snapshots" -> distinct(runs.summaries(userId, request.ids()), CatalogSelectionService::snapshot);
            case "bookmarks" -> distinct(runs.summaries(userId, request.ids()), CatalogSelectionService::bookmark);
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown selection catalog");
        };
    }

    private static List<CatalogSelectionItemDto> runItems(List<PredictionRunCatalogItemDto> candidates,
            CatalogSelectionRequest request) {
        DateTimeFormatter date;
        try {
            date = DateTimeFormatter.ofLocalizedDateTime(FormatStyle.SHORT)
                    .withLocale(Locale.forLanguageTag(request.locale()))
                    .withZone(ZoneId.of(request.timeZone()));
        } catch (IllegalArgumentException | DateTimeException error) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid selection locale", error);
        }
        return candidates.stream()
                .map(item -> new CatalogSelectionItemDto(
                        item.id().toString(), item.name(), date.format(item.createdAt())))
                .toList();
    }

    private static CatalogSelectionItemDto snapshot(PredictionRunCatalogItemDto item) {
        String label = InferenceCatalogValues.snapshotLabel(item.schemaVersionName(), item.schemaVersion());
        return new CatalogSelectionItemDto(
                item.schemaId() + ":" + item.schemaVersionId(), item.schemaName() + " · " + label, null);
    }

    private static CatalogSelectionItemDto bookmark(PredictionRunCatalogItemDto item) {
        return item.bookmarkId() == null
                ? new CatalogSelectionItemDto("none", "No bookmark", null)
                : new CatalogSelectionItemDto(item.bookmarkId().toString(), item.bookmarkName(), null);
    }

    /** One choice per group the candidates fall in, in the order the groups first appear. */
    private static List<CatalogSelectionItemDto> distinct(List<PredictionRunCatalogItemDto> candidates,
            Function<PredictionRunCatalogItemDto, CatalogSelectionItemDto> group) {
        Map<String, CatalogSelectionItemDto> groups = new LinkedHashMap<>();
        candidates.stream().map(group).forEach(item -> groups.putIfAbsent(item.id(), item));
        return List.copyOf(groups.values());
    }

    private static List<CatalogSelectionItemDto> matches(List<CatalogSelectionItemDto> items,
            CatalogSelectionRequest request) {
        Comparator<String> titles = InferenceCatalogText.of(request.locale()).cellOrder();
        return items.stream()
                .filter(item -> CatalogPages.contains(request.catalog().search(), item.title(), item.detail()))
                .sorted(Comparator.comparing(CatalogSelectionItemDto::title, titles)
                        .thenComparing(CatalogSelectionItemDto::id))
                .toList();
    }
}
