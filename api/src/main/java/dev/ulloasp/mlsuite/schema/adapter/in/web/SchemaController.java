package dev.ulloasp.mlsuite.schema.adapter.in.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaRequest;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaCatalogItemDto;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaCatalogUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/schemas")
@RequiredArgsConstructor
public class SchemaController {

    private final SchemaCatalogUseCase schemaCatalogUseCase;

    @PostMapping
    public ResponseEntity<SchemaDto> create(CurrentUser user,
            @Valid @RequestBody CreateSchemaRequest request) {
        Schema schema = schemaCatalogUseCase.createSchema(user.userId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(SchemaDto.from(schema));
    }

    @GetMapping
    public ResponseEntity<PageDto<SchemaCatalogItemDto>> list(CurrentUser user,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "24") int size,
            @RequestParam(name = "search", defaultValue = "") String search,
            @RequestParam(name = "sort", defaultValue = "updated") String sort,
            @RequestParam(name = "status", defaultValue = "active") String status) {
        return ResponseEntity.ok(schemaCatalogUseCase.getSchemaPage(
                user.userId(), page, size, search, sort, status));
    }

    @GetMapping("/all")
    public ResponseEntity<List<SchemaDto>> listAll(CurrentUser user) {
        return ResponseEntity.ok(SchemaDto.fromList(schemaCatalogUseCase.listSchemas(user.userId())));
    }

    @GetMapping("/{schemaId}")
    public ResponseEntity<SchemaDto> get(CurrentUser user, @PathVariable Long schemaId) {
        return ResponseEntity.ok(SchemaDto.from(schemaCatalogUseCase.getSchema(user.userId(), schemaId)));
    }

    @PatchMapping("/{schemaId}")
    public ResponseEntity<SchemaDto> rename(CurrentUser user, @PathVariable Long schemaId,
            @RequestParam String name) {
        return ResponseEntity.ok(SchemaDto.from(schemaCatalogUseCase.renameSchema(
                user.userId(), schemaId, name)));
    }

    @PostMapping("/{schemaId}/archive")
    public ResponseEntity<SchemaDto> archive(CurrentUser user, @PathVariable Long schemaId) {
        return ResponseEntity.ok(SchemaDto.from(schemaCatalogUseCase.archiveSchema(user.userId(), schemaId)));
    }

    @PostMapping("/{schemaId}/duplicate")
    public ResponseEntity<SchemaDto> duplicate(CurrentUser user, @PathVariable Long schemaId,
            @RequestParam(required = false) Long versionId, @RequestParam String name) {
        return ResponseEntity.status(HttpStatus.CREATED).body(SchemaDto.from(schemaCatalogUseCase.duplicateSchema(
                user.userId(), schemaId, versionId, name)));
    }

    @DeleteMapping("/{schemaId}")
    public ResponseEntity<Void> delete(CurrentUser user, @PathVariable Long schemaId) {
        schemaCatalogUseCase.deleteSchema(user.userId(), schemaId);
        return ResponseEntity.noContent().build();
    }
}
