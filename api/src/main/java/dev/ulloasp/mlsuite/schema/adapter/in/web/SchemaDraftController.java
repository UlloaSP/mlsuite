package dev.ulloasp.mlsuite.schema.adapter.in.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SchemaDraftController {

    private final SchemaDraftUseCase draftUseCase;

    @GetMapping("/schemas/{schemaId}/drafts")
    public ResponseEntity<List<SchemaDraftDto>> list(CurrentUser user, @PathVariable Long schemaId) {
        return ResponseEntity.ok(draftUseCase.listDrafts(user.userId(), schemaId).stream()
                .map(SchemaDraftDto::from)
                .toList());
    }

    @PostMapping("/schemas/{schemaId}/drafts")
    public ResponseEntity<SchemaDraftDto> create(CurrentUser user, @PathVariable Long schemaId,
            @Valid @RequestBody CreateSchemaDraftRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(SchemaDraftDto.from(
                draftUseCase.createDraft(user.userId(), schemaId, request)));
    }

    @GetMapping("/schema-drafts/{draftId}")
    public ResponseEntity<SchemaDraftDto> get(CurrentUser user, @PathVariable Long draftId) {
        return ResponseEntity.ok(SchemaDraftDto.from(draftUseCase.getDraft(user.userId(), draftId)));
    }

    @PutMapping("/schema-drafts/{draftId}")
    public ResponseEntity<SchemaDraftDto> update(CurrentUser user, @PathVariable Long draftId,
            @Valid @RequestBody UpdateSchemaDraftRequest request) {
        return ResponseEntity.ok(SchemaDraftDto.from(
                draftUseCase.updateDraft(user.userId(), draftId, request)));
    }

    @GetMapping("/schema-drafts/{draftId}/diff")
    public ResponseEntity<SchemaDraftDiffDto> diff(CurrentUser user, @PathVariable Long draftId) {
        return ResponseEntity.ok(draftUseCase.diffDraft(user.userId(), draftId));
    }

    @PostMapping("/schema-drafts/{draftId}/merge")
    public ResponseEntity<SchemaDraftMergeResultDto> merge(CurrentUser user,
            @PathVariable Long draftId, @Valid @RequestBody SchemaDraftMergeRequest request) {
        return ResponseEntity.ok(draftUseCase.mergeDraft(user.userId(), draftId, request));
    }

    @PostMapping("/schema-drafts/{draftId}/publish")
    public ResponseEntity<SchemaDraftPublishResultDto> publish(CurrentUser user,
            @PathVariable Long draftId, @Valid @RequestBody PublishSchemaDraftRequest request) {
        return ResponseEntity.ok(draftUseCase.publishDraft(user.userId(), draftId, request));
    }
}
