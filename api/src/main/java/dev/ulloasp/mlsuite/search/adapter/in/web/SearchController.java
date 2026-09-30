package dev.ulloasp.mlsuite.search.adapter.in.web;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.search.application.dto.SearchResponseDto;
import dev.ulloasp.mlsuite.search.application.port.in.SearchWorkspaceUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/search")
public class SearchController {

    private final SearchWorkspaceUseCase searchWorkspaceUseCase;

    @GetMapping
    public ResponseEntity<SearchResponseDto> search(
            CurrentUser user,
            @RequestParam(name = "q", defaultValue = "") String query) {
        return ResponseEntity.ok(searchWorkspaceUseCase.search(
                user.userId(),
                query));
    }
}
