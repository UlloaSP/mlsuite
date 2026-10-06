package dev.ulloasp.mlsuite.schema.application.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkDto;
import dev.ulloasp.mlsuite.schema.application.port.in.PublicBookmarkUseCase;
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
}
