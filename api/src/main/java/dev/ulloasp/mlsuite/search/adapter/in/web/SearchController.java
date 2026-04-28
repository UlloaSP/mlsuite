package dev.ulloasp.mlsuite.search.adapter.in.web;

import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import dev.ulloasp.mlsuite.search.application.dto.SearchResponseDto;

@RequestMapping("/api/search")
public interface SearchController {

    @GetMapping
    ResponseEntity<SearchResponseDto> search(
            OAuth2AuthenticationToken authentication,
            @RequestParam(name = "q", defaultValue = "") String query);
}
