package dev.ulloasp.mlsuite.apiaccess.adapter.in.web;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiAccessBookmarkDto;
import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiRequestDto;
import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiUsageDto;
import dev.ulloasp.mlsuite.apiaccess.application.port.in.ApiClientAccessUseCase;
import dev.ulloasp.mlsuite.apiaccess.application.port.in.ApiUsageUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import lombok.RequiredArgsConstructor;

/** What the member's current organization exposes through the client API, and how it is used. */
@RestController
@RequestMapping("/api/api-access")
@RequiredArgsConstructor
public class ApiAccessController {

    private final ApiClientAccessUseCase access;
    private final ApiUsageUseCase usage;

    @GetMapping("/bookmarks")
    public List<ApiAccessBookmarkDto> listApiAccessBookmarks(CurrentUser user) {
        return access.listBookmarks(user.userId());
    }

    @GetMapping("/requests")
    public PageDto<ApiRequestDto> listApiRequests(CurrentUser user,
            @RequestParam(required = false) Long clientId, @ModelAttribute CatalogRequest request) {
        return usage.listRequests(user.userId(), clientId, request);
    }

    @GetMapping("/usage")
    public ApiUsageDto getApiUsage(CurrentUser user, @RequestParam(defaultValue = "day") String period,
            @RequestParam(required = false) Long clientId) {
        return usage.usage(user.userId(), period, clientId);
    }
}
