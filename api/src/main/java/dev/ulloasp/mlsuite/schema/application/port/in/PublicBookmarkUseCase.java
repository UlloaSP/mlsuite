package dev.ulloasp.mlsuite.schema.application.port.in;

import java.util.List;

import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkSummaryDto;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkExampleDto;

public interface PublicBookmarkUseCase {
    /** The published bookmark behind a public id, readable without a session. */
    PublicBookmarkDto getPublishedBookmark(String publicId);

    /** One page of every published bookmark, readable without a session. */
    PageDto<PublicBookmarkSummaryDto> getPublishedBookmarkPage(int page, int size, String search, String sort);
    /** The curated examples a published bookmark serves now: marked runs of the snapshot it pins. */
    List<PublicBookmarkExampleDto> listPublishedExamples(String publicId);
}
