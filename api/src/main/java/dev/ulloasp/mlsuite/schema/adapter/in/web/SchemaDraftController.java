package dev.ulloasp.mlsuite.schema.adapter.in.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaDraftRequest;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaDraftDiffDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaDraftDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaDraftMergeRequest;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaDraftMergeResultDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaDraftPublishResultDto;
import dev.ulloasp.mlsuite.schema.application.dto.UpdateSchemaDraftRequest;
import dev.ulloasp.mlsuite.schema.application.dto.PublishSchemaDraftRequest;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaDraftUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
public class SchemaDraftController {

    private final CurrentUserResolver currentUserResolver;
    private final SchemaDraftUseCase draftUseCase;

    public SchemaDraftController(CurrentUserResolver currentUserResolver, SchemaDraftUseCase draftUseCase) {
        this.currentUserResolver = currentUserResolver;
        this.draftUseCase = draftUseCase;
    }

    @GetMapping("/schemas/{schemaId}/drafts")
    public ResponseEntity<List<SchemaDraftDto>> list(Authentication authentication, @PathVariable Long schemaId) {
        return ResponseEntity.ok(draftUseCase.listDrafts(userId(authentication), schemaId).stream()
                .map(SchemaDraftDto::from)
                .toList());
    }

    @PostMapping("/schemas/{schemaId}/drafts")
    public ResponseEntity<SchemaDraftDto> create(Authentication authentication, @PathVariable Long schemaId,
            @Valid @RequestBody CreateSchemaDraftRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(SchemaDraftDto.from(
                draftUseCase.createDraft(userId(authentication), schemaId, request)));
    }

    @GetMapping("/schema-drafts/{draftId}")
    public ResponseEntity<SchemaDraftDto> get(Authentication authentication, @PathVariable Long draftId) {
        return ResponseEntity.ok(SchemaDraftDto.from(draftUseCase.getDraft(userId(authentication), draftId)));
    }

    @PutMapping("/schema-drafts/{draftId}")
    public ResponseEntity<SchemaDraftDto> update(Authentication authentication, @PathVariable Long draftId,
            @Valid @RequestBody UpdateSchemaDraftRequest request) {
        return ResponseEntity.ok(SchemaDraftDto.from(
                draftUseCase.updateDraft(userId(authentication), draftId, request)));
    }

    @GetMapping("/schema-drafts/{draftId}/diff")
    public ResponseEntity<SchemaDraftDiffDto> diff(Authentication authentication, @PathVariable Long draftId) {
        return ResponseEntity.ok(draftUseCase.diffDraft(userId(authentication), draftId));
    }

    @PostMapping("/schema-drafts/{draftId}/merge")
    public ResponseEntity<SchemaDraftMergeResultDto> merge(Authentication authentication,
            @PathVariable Long draftId, @Valid @RequestBody SchemaDraftMergeRequest request) {
        return ResponseEntity.ok(draftUseCase.mergeDraft(userId(authentication), draftId, request));
    }

    @PostMapping("/schema-drafts/{draftId}/publish")
    public ResponseEntity<SchemaDraftPublishResultDto> publish(Authentication authentication,
            @PathVariable Long draftId, @Valid @RequestBody PublishSchemaDraftRequest request) {
        return ResponseEntity.ok(draftUseCase.publishDraft(userId(authentication), draftId, request));
    }

    private Long userId(Authentication authentication) {
        return currentUserResolver.resolve(authentication).userId();
    }
}
