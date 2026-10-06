package dev.ulloasp.mlsuite.schema.application.service;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkExampleRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkExampleDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkSummaryDto;
import dev.ulloasp.mlsuite.schema.application.port.in.PublicBookmarkUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.BookmarkExampleStatus;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmarkExample;
import dev.ulloasp.mlsuite.util.PageDto;
import lombok.RequiredArgsConstructor;

/**
 * The public surface of bookmarks. It never consults a session: visibility alone decides, and a
 * private, unknown, or archived bookmark is indistinguishable from one that does not exist.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class PublicBookmarkService implements PublicBookmarkUseCase {

    private final SchemaBookmarkRepository bookmarkRepository;
    private final SchemaBookmarkExampleRepository exampleRepository;

    @Override
    public PublicBookmarkDto getPublishedBookmark(String publicId) {
        return PublicBookmarkDto.from(requirePublished(publicId));
    }

    @Override
    public List<PublicBookmarkExampleDto> listPublishedExamples(String publicId) {
        SchemaBookmark bookmark = requirePublished(publicId);
        return exampleRepository.findByBookmarkIdOrderByCreatedAtAscIdAsc(bookmark.getId()).stream()
                .filter(example -> example.status() == BookmarkExampleStatus.SERVED)
                .map(this::publicExample)
                .toList();
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

    @Override
    public PageDto<PublicBookmarkSummaryDto> getPublishedBookmarkPage(int page, int size, String search, String sort) {
        Page<SchemaBookmark> bookmarks = bookmarkRepository.findPublishedPage(
                search == null ? "" : search.strip(),
                PageDto.request(page, size, sort(sort)));
        return PageDto.of(bookmarks, bookmarks.getContent().stream().map(PublicBookmarkSummaryDto::from).toList());
    }

    private Sort sort(String mode) {
        if ("name".equals(mode)) {
            return Sort.by(Sort.Order.asc("name").ignoreCase(), Sort.Order.desc("updatedAt"));
        }
        return Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.asc("name").ignoreCase());
    }
}
