package dev.ulloasp.mlsuite.schema.application.service;

import java.util.List;
import java.util.Locale;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.schema.application.dto.BookmarkExampleStateDto;
import dev.ulloasp.mlsuite.schema.application.dto.PredictBookmarkDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkExampleDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicRunDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaBookmarkExampleDto;
import dev.ulloasp.mlsuite.schema.application.port.in.BookmarkListCatalogUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.PredictBookmarkCatalogUseCase;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkExampleRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmarkExample;
import dev.ulloasp.mlsuite.schema.domain.model.BookmarkVisibility;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import dev.ulloasp.mlsuite.schema.application.port.in.PublicRunUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaBookmarkExampleUseCase;
import dev.ulloasp.mlsuite.security.identity.PublicCaller;
import dev.ulloasp.mlsuite.util.CatalogPages;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.CatalogValues;
import dev.ulloasp.mlsuite.util.PageDto;
import lombok.RequiredArgsConstructor;

/**
 * One bookmark's examples and runs one page at a time, searched before the database selects the page.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class BookmarkListCatalogService implements BookmarkListCatalogUseCase {
    private static final List<String> EXAMPLE_STATES = List.of("ALL", "SERVED", "BOOKMARK_PRIVATE", "BOOKMARK_MOVED");

    private final PublicBookmarkService bookmarks;
    private final SchemaBookmarkRepository bookmarkRepository;
    private final SchemaBookmarkExampleRepository exampleRepository;
    private final WorkspaceAuthorizationService authorization;
    private final PublicRunUseCase runs;
    private final SchemaBookmarkExampleUseCase examples;
    private final PredictBookmarkCatalogUseCase predict;

    @Override
    public PageDto<PublicBookmarkExampleDto> publicExamples(String publicId, CatalogRequest request) {
        var bookmark = bookmarks.requirePublic(publicId);
        request.requireNoChoices();
        var page = exampleRepository.findAll(matching(bookmark.getId(), request.search(), "SERVED"),
                CatalogPages.pageable(request, Sort.by(Sort.Order.asc("run.name").ignoreCase(),
                        Sort.Order.asc("publicId"))));
        return PageDto.of(page, page.getContent().stream().map(example -> new PublicBookmarkExampleDto(
                example.getPublicId(), example.getRun().getName(),
                PublicExampleInputs.of(bookmark.getVersion().getFormSchema(), example.getRun().getInputData())))
                .toList());
    }

    @Override
    public PageDto<PublicRunDto> publicRuns(String publicId, PublicCaller caller, CatalogRequest request) {
        return runs.catalog(publicId, caller, request);
    }

    @Override
    public PageDto<SchemaBookmarkExampleDto> examples(Long userId, Long bookmarkId, CatalogRequest request) {
        Long org = authorization.requireCurrent(userId, PermissionKey.VIEW_MODELS).getId();
        bookmarkRepository.findByIdAndOrganizationId(bookmarkId, org)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema bookmark not found"));
        var page = exampleRepository.findAll(matching(bookmarkId, request.search(),
                exampleState(request.requireOneOrder().filter())),
                CatalogPages.pageable(request, Sort.by(Sort.Order.asc("run.name").ignoreCase(),
                        Sort.Order.asc("run.id"))));
        return PageDto.of(page, page.getContent().stream().map(SchemaBookmarkExampleDto::from).toList());
    }

    @Override
    public BookmarkExampleStateDto example(Long userId, Long bookmarkId, Long runId) {
        return new BookmarkExampleStateDto(examples.findExample(userId, bookmarkId, runId).orElse(null));
    }

    @Override
    public PredictBookmarkDto statistics(Long userId, Long bookmarkId) {
        return predict.bookmark(userId, bookmarkId);
    }

    /** {@code filter} is, in any case, one of {@link #EXAMPLE_STATES}. */
    private static String exampleState(String filter) {
        String state = filter.toUpperCase(Locale.ROOT);
        if (!EXAMPLE_STATES.contains(state)) {
            throw CatalogValues.unknown("filter", filter, EXAMPLE_STATES);
        }
        return state;
    }

    private Specification<SchemaBookmarkExample> matching(Long bookmarkId, String search, String state) {
        return (root, query, builder) -> {
            var version = root.get("run").get("schemaVersion");
            var pinned = builder.equal(version.get("id"), root.get("bookmark").get("version").get("id"));
            var published = builder.equal(root.get("bookmark").get("visibility"), BookmarkVisibility.PUBLIC);
            var states = switch (state) {
                case "ALL" -> builder.conjunction();
                case "SERVED" -> builder.and(pinned, published);
                case "BOOKMARK_PRIVATE" -> builder.and(pinned, builder.not(published));
                case "BOOKMARK_MOVED" -> builder.not(pinned);
                default -> throw new IllegalStateException("Unchecked example state " + state);
            };
            String pattern = CatalogPages.likeLiteral(search);
            return builder.and(builder.equal(root.get("bookmark").get("id"), bookmarkId), states,
                    builder.or(builder.like(builder.lower(root.get("run").get("name")), pattern, '!'),
                            builder.like(builder.lower(version.get("name")), pattern, '!'),
                            builder.like(builder.concat("v", version.get("version").as(String.class)), pattern, '!')));
        };
    }
}
