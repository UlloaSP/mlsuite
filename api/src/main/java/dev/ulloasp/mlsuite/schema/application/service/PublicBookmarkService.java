package dev.ulloasp.mlsuite.schema.application.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkSummaryDto;
import dev.ulloasp.mlsuite.schema.application.port.in.PublicBookmarkUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
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

    @Override
    public PublicBookmarkDto getPublishedBookmark(String publicId) {
        return bookmarkRepository.findPublishedByPublicId(publicId)
                .map(PublicBookmarkDto::from)
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
