package dev.ulloasp.mlsuite.apiaccess.adapter.in.web;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.apiaccess.application.dto.AdminApiClientDto;
import dev.ulloasp.mlsuite.apiaccess.application.dto.AdminApiOrganizationDto;
import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiCallLimitRequest;
import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiUsageDto;
import dev.ulloasp.mlsuite.apiaccess.application.dto.SuspendApiClientRequest;
import dev.ulloasp.mlsuite.apiaccess.application.port.in.ApiTrafficUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import lombok.RequiredArgsConstructor;

/** The platform's API traffic: every organization's clients and limits, for superadmins. */
@RestController
@RequestMapping("/api/admin/api-traffic")
@PreAuthorize("hasRole('SUPERADMIN')")
@RequiredArgsConstructor
public class AdminApiTrafficController {

    private final ApiTrafficUseCase traffic;

    @GetMapping("/usage")
    public ApiUsageDto getApiTrafficUsage(@RequestParam(defaultValue = "day") String period) {
        return traffic.usage(period);
    }

    @GetMapping("/clients")
    public PageDto<AdminApiClientDto> listApiTrafficClients(@ModelAttribute CatalogRequest request) {
        return traffic.listClients(request);
    }

    @PostMapping("/clients/{clientId}/suspend")
    public AdminApiClientDto suspendApiClient(CurrentUser user, @PathVariable Long clientId,
            @RequestBody SuspendApiClientRequest request) {
        return traffic.suspend(user.userId(), clientId, request);
    }

    @PostMapping("/clients/{clientId}/reinstate")
    public AdminApiClientDto reinstateApiClient(CurrentUser user, @PathVariable Long clientId) {
        return traffic.reinstate(user.userId(), clientId);
    }

    @GetMapping("/organizations")
    public PageDto<AdminApiOrganizationDto> listApiTrafficOrganizations(@ModelAttribute CatalogRequest request) {
        return traffic.listOrganizations(request);
    }

    @PutMapping("/organizations/{organizationId}/call-limit")
    public AdminApiOrganizationDto setApiCallLimit(CurrentUser user, @PathVariable Long organizationId,
            @RequestBody ApiCallLimitRequest request) {
        return traffic.setCallLimit(user.userId(), organizationId, request);
    }
}
