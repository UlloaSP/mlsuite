package dev.ulloasp.mlsuite.admin.alert;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/alerts")
@PreAuthorize("hasRole('SUPERADMIN')")
@RequiredArgsConstructor
public class SystemAlertController {

    private final SystemAlertService alerts;

    @GetMapping
    public SystemAlertsDto systemAlerts() {
        return alerts.overview();
    }
}
