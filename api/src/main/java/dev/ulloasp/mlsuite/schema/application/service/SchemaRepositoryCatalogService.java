package dev.ulloasp.mlsuite.schema.application.service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaDraftRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaVersionRepository;
import dev.ulloasp.mlsuite.schema.application.dto.BookmarkExampleCounts;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaBookmarkDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaChangeCatalogItemDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaDraftDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaVersionDto;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaBookmarkExampleUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaRepositoryCatalogUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaDraft;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaDraftStatus;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaModelBinding;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.util.CatalogPages;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;

/**
 * A schema's snapshots, changes and bookmarks one page at a time. The database filters, searches
 * and orders each of them; bindings and example counts are read once for the rows of the page.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class SchemaRepositoryCatalogService implements SchemaRepositoryCatalogUseCase {
    private final WorkspaceAuthorizationService authorizationService;
    private final SchemaRepository schemaRepository;
    private final SchemaVersionRepository versionRepository;
    private final SchemaModelBindingRepository bindingRepository;
    private final SchemaDraftRepository draftRepository;
    private final SchemaBookmarkRepository bookmarkRepository;
    private final SchemaBookmarkExampleUseCase examples;

    @Override
    public PageDto<SchemaVersionDto> snapshots(Long userId, Long schemaId, CatalogRequest request) {
        requireSchema(userId, schemaId);
        Page<SchemaVersion> page = versionRepository.findSnapshotPage(schemaId, request.filter(),
                CatalogPages.likeLiteral(request.search()), request.sort(),
                CatalogPages.pageable(request, Sort.unsorted()));
        List<Long> versionIds = page.getContent().stream().map(SchemaVersion::getId).toList();
        Map<Long, List<SchemaModelBinding>> bindings = bindingRepository.findBySchemaVersionIdIn(versionIds).stream()
                .collect(Collectors.groupingBy(binding -> binding.getSchemaVersion().getId()));
        return PageDto.of(page, page.getContent().stream()
                .map(version -> SchemaVersionDto.from(version, bindings.getOrDefault(version.getId(), List.of())))
                .toList());
    }

    /** Changes still open: {@code filter} is "all", "open" or one of their statuses. */
    @Override
    public PageDto<SchemaChangeCatalogItemDto> changes(Long userId, Long schemaId, CatalogRequest request) {
        requireSchema(userId, schemaId);
        Sort order = switch (request.sort()) {
            case "name" -> Sort.by(Sort.Order.asc("name").ignoreCase());
            case "base" -> Sort.by(Sort.Order.desc("baseVersion.version"));
            default -> Sort.by(Sort.Order.desc("updatedAt"));
        };
        Page<SchemaDraft> page = draftRepository.findAll(openChanges(schemaId, request),
                CatalogPages.pageable(request, order.and(Sort.by("id"))));
        return PageDto.of(page, page.getContent().stream()
                .map(draft -> new SchemaChangeCatalogItemDto(SchemaDraftDto.from(draft),
                        draft.getBaseVersion().getName()))
                .toList());
    }

    /** {@code filter} is "all", "latest" for bookmarks on the newest snapshot, or "older" for the rest. */
    @Override
    public PageDto<SchemaBookmarkDto> bookmarks(Long userId, Long schemaId, CatalogRequest request) {
        requireSchema(userId, schemaId);
        Sort order = switch (request.sort()) {
            case "name" -> Sort.by(Sort.Order.asc("name").ignoreCase());
            case "version" -> Sort.by(Sort.Order.desc("version.version"));
            default -> Sort.by(Sort.Order.desc("updatedAt"));
        };
        int latest = versionRepository.findMaxVersionBySchemaId(schemaId);
        Page<SchemaBookmark> page = bookmarkRepository.findAll(schemaBookmarks(schemaId, latest, request),
                CatalogPages.pageable(request, order.and(Sort.by("id"))));
        Map<Long, BookmarkExampleCounts> counts = examples.countExamples(
                page.getContent().stream().map(SchemaBookmark::getId).toList());
        return PageDto.of(page, page.getContent().stream()
                .map(bookmark -> SchemaBookmarkDto.from(bookmark, counts))
                .toList());
    }

    private Specification<SchemaDraft> openChanges(Long schemaId, CatalogRequest request) {
        return (root, query, builder) -> {
            String search = CatalogPages.likeLiteral(request.search());
            Path<SchemaDraftStatus> status = root.get("status");
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(builder.equal(root.get("schema").get("id"), schemaId));
            predicates.add(builder.notEqual(status, SchemaDraftStatus.PUBLISHED));
            if (!request.filter().equals("all") && !request.filter().equals("open")) {
                predicates.add(oneOf(builder, status, statuses(name -> name.equalsIgnoreCase(request.filter()))));
            }
            predicates.add(builder.or(
                    builder.like(builder.lower(root.get("name")), search, '!'),
                    builder.like(text(builder, root.get("id")), search, '!'),
                    oneOf(builder, status, statuses(name -> CatalogPages.contains(request.search(), name)))));
            return builder.and(predicates.toArray(Predicate[]::new));
        };
    }

    private Specification<SchemaBookmark> schemaBookmarks(Long schemaId, int latest, CatalogRequest request) {
        return (root, query, builder) -> {
            String search = CatalogPages.likeLiteral(request.search());
            Path<Integer> version = root.get("version").get("version");
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(builder.equal(root.get("schema").get("id"), schemaId));
            predicates.add(switch (request.filter()) {
                case "all" -> builder.conjunction();
                case "latest" -> builder.equal(version, latest);
                case "older" -> builder.notEqual(version, latest);
                default -> builder.disjunction();
            });
            predicates.add(builder.or(
                    builder.like(builder.lower(root.get("name")), search, '!'),
                    builder.like(text(builder, root.get("id")), search, '!'),
                    builder.like(builder.concat("v", text(builder, version)), search, '!')));
            return builder.and(predicates.toArray(Predicate[]::new));
        };
    }

    /** A number as the text a card shows it, so a search can match part of it. */
    private Expression<String> text(CriteriaBuilder builder, Path<? extends Number> number) {
        return builder.function("str", String.class, number);
    }

    private List<SchemaDraftStatus> statuses(Function<String, Boolean> matches) {
        return Arrays.stream(SchemaDraftStatus.values())
                .filter(status -> matches.apply(status.name()))
                .toList();
    }

    /** An empty list matches no change; it is never sent to the database as an empty IN. */
    private Predicate oneOf(CriteriaBuilder builder, Path<SchemaDraftStatus> status, List<SchemaDraftStatus> values) {
        return values.isEmpty() ? builder.disjunction() : status.in(values);
    }

    private void requireSchema(Long userId, Long schemaId) {
        Long organizationId = authorizationService.requireCurrent(userId, PermissionKey.VIEW_MODELS).getId();
        schemaRepository.findByIdAndOrganizationId(schemaId, organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema not found"));
    }
}
