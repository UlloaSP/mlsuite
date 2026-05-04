package dev.ulloasp.mlsuite.search.application.port.in;

import dev.ulloasp.mlsuite.search.application.dto.SearchResponseDto;

public interface SearchWorkspaceUseCase {

    SearchResponseDto search(Long userId, String query);
}
