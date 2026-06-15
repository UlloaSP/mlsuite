package dev.ulloasp.mlsuite.startup;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/readiness")
public class StartupReadinessController {

    private final StartupReadinessService readinessService;

    public StartupReadinessController(StartupReadinessService readinessService) {
        this.readinessService = readinessService;
    }

    @GetMapping
    public ResponseEntity<StartupReadinessDto> readiness() {
        return ResponseEntity.ok(readinessService.check());
    }
}
