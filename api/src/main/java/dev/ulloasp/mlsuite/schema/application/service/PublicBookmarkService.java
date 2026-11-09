package dev.ulloasp.mlsuite.schema.application.service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.plugin.application.dto.PluginRuntimeSourceDto;
import dev.ulloasp.mlsuite.plugin.application.port.in.SnapshotPluginsUseCase;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkExampleRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkExampleDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkSummaryDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicPredictionRequest;
import dev.ulloasp.mlsuite.schema.application.port.in.PublicBookmarkUseCase;
import dev.ulloasp.mlsuite.schema.application.service.PublicPredictionPlan.ModelCall;
import dev.ulloasp.mlsuite.schema.domain.model.BookmarkExampleStatus;
import dev.ulloasp.mlsuite.schema.domain.model.BoundModel;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmarkExample;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.util.CatalogValues;
import dev.ulloasp.mlsuite.util.PageDto;
import lombok.RequiredArgsConstructor;

/**
 * The public surface of bookmarks. It never consults a session: visibility alone decides, and a
 * private, unknown, or archived bookmark is indistinguishable from one that does not exist.
 * Everything a public run needs from the database is read here, in one short transaction, so
 * the runtime is called afterwards with no connection held.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class PublicBookmarkService implements PublicBookmarkUseCase {

    private static final Logger log = LoggerFactory.getLogger(PublicBookmarkService.class);

    private final SchemaBookmarkRepository bookmarkRepository;
    private final SchemaBookmarkExampleRepository exampleRepository;
    private final BookmarkPublishability publishability;
    private final SnapshotRunGuard guard;
    private final SnapshotPluginsUseCase plugins;

    @Override
    public PublicBookmarkDto getPublishedBookmark(String publicId) {
        SchemaBookmark bookmark = requirePublished(publicId);
        SchemaVersion version = bookmark.getVersion();
        PublicForm form = PublicForm.of(version.getFormSchema(), publishability.models(version));
        return PublicBookmarkDto.from(bookmark, form.schema(), form.inputCount(), form.reportCount());
    }

    @Override
    public List<PublicBookmarkExampleDto> listPublishedExamples(String publicId) {
        SchemaBookmark bookmark = requirePublished(publicId);
        return exampleRepository.findByBookmarkIdOrderByCreatedAtAscIdAsc(bookmark.getId()).stream()
                .filter(example -> example.status() == BookmarkExampleStatus.SERVED)
                .map(this::publicExample)
                .toList();
    }

    @Override
    public List<PluginRuntimeSourceDto> listPublishedPlugins(String publicId) {
        SchemaBookmark bookmark = requirePublished(publicId);
        return plugins.pinned(bookmark.getSchema().getOrganization().getId(), bookmark.getVersion().getId());
    }

    @Override
    public PageDto<PublicBookmarkSummaryDto> getPublishedBookmarkPage(int page, int size, String search, String sort) {
        Page<SchemaBookmark> bookmarks = bookmarkRepository.findPublishedPage(
                search == null ? "" : search.strip(),
                PageDto.request(page, size, sort(sort)));
        return PageDto.of(bookmarks, summaries(bookmarks.getContent()));
    }

    @Override
    public List<PublicBookmarkSummaryDto> getPinnedBookmarks(Long userId) {
        return summaries(bookmarkRepository.findPinnedBy(userId));
    }

    @Override
    public PageDto<PublicBookmarkSummaryDto> getUnpinnedBookmarkPage(Long organizationId, int page, int size,
            String search) {
        Page<SchemaBookmark> bookmarks = bookmarkRepository.findPublishedUnpinned(organizationId,
                search == null ? "" : search.strip(), PageDto.request(page, size, sort("updated")));
        return PageDto.of(bookmarks, summaries(bookmarks.getContent()));
    }

    /** A card counts what the bookmark's page shows, so it is read from the same public form. */
    private List<PublicBookmarkSummaryDto> summaries(List<SchemaBookmark> bookmarks) {
        Map<Long, List<BoundModel>> models = publishability.models(
                bookmarks.stream().map(SchemaBookmark::getVersion).toList());
        return bookmarks.stream().map(bookmark -> {
            SchemaVersion version = bookmark.getVersion();
            PublicForm form = PublicForm.of(version.getFormSchema(), models.getOrDefault(version.getId(), List.of()));
            return PublicBookmarkSummaryDto.from(bookmark, form.inputCount(), form.reportCount());
        }).toList();
    }

    /** Answers 404 unless the bookmark is public now, as every public read of it does. */
    public SchemaBookmark requirePublic(String publicId) {
        return requirePublished(publicId);
    }

    /** A stored run's form, with its keys: the snapshot the run was made on, not the bookmark's now. */
    public PublicForm formOf(SchemaVersion version) {
        return PublicForm.of(version.getFormSchema(), publishability.models(version));
    }

    /** Checks a public run against the bookmark as it is now and routes its values to each model. */
    public PublicPredictionPlan planPrediction(String publicId, PublicPredictionRequest request) {
        SchemaBookmark bookmark = requirePublished(publicId);
        SchemaVersion version = bookmark.getVersion();
        if (version.getVersion() != request.version()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This bookmark changed after the page was loaded. Reload the page and run it again.");
        }
        List<BoundModel> models = publishability.models(version);
        Optional<String> refusal = publishability.refusal(models);
        if (guard.purging(version.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This bookmark cannot be run publicly.");
        }
        if (refusal.isPresent()) {
            log.warn("Public bookmark {} was not run: {}", publicId, refusal.get());
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This bookmark cannot be run publicly.");
        }
        PublicForm form = PublicForm.of(version.getFormSchema(), models);
        Map<String, Object> values = PublicFormValues.require(form, request.values());
        return new PublicPredictionPlan(publicId, bookmark.getId(), version.getId(),
                models.stream()
                        .map(model -> new ModelCall(model.id(), form.modelInput(model, values)))
                        .toList(),
                form.reportRoutes(),
                form.storedInputs(values));
    }

    private PublicBookmarkExampleDto publicExample(SchemaBookmarkExample example) {
        return new PublicBookmarkExampleDto(
                example.getPublicId(),
                example.getRun().getName(),
                PublicExampleInputs.of(example.getBookmark().getVersion().getFormSchema(),
                        example.getRun().getInputData()));
    }

    private SchemaBookmark requirePublished(String publicId) {
        return bookmarkRepository.findPublishedByPublicId(publicId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Public bookmark not found"));
    }

    private Sort sort(String mode) {
        Sort.Order byId = Sort.Order.asc("id");
        return switch (mode) {
            case "updated" -> Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.asc("name").ignoreCase(), byId);
            case "name" -> Sort.by(Sort.Order.asc("name").ignoreCase(), Sort.Order.desc("updatedAt"), byId);
            default -> throw CatalogValues.unknown("sort", mode, List.of("updated", "name"));
        };
    }
}
