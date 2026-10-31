package dev.ulloasp.mlsuite.admin.purge;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/purges")
@PreAuthorize("hasRole('SUPERADMIN')")
@RequiredArgsConstructor
public class PurgeController {

    private final PurgeRequestService purges;

    @GetMapping
    public PageDto<PurgeJobDto> list(@ModelAttribute CatalogRequest request) {
        return purges.list(request);
    }

    @GetMapping("/preview")
    public PurgePreviewDto preview(CurrentUser actor, @RequestParam PurgeScope scope, @RequestParam Long targetId) {
        return purges.preview(actor.userId(), scope, targetId);
    }

    @PostMapping
    public ResponseEntity<PurgeJobDto> request(CurrentUser actor, @Valid @RequestBody RequestPurgeRequest request) {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(purges.request(actor.userId(), request));
    }

    @PostMapping("/{jobId}/retry")
    public PurgeJobDto retry(CurrentUser actor, @PathVariable Long jobId) {
        return purges.retry(actor.userId(), jobId);
    }
}
