package dev.ulloasp.mlsuite.startup;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/readiness")
@RequiredArgsConstructor
public class StartupReadinessController {

    private final StartupReadinessService readinessService;

    @GetMapping
    public ResponseEntity<StartupReadinessDto> readiness() {
        return ResponseEntity.ok(readinessService.check());
    }
}
