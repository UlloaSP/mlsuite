package dev.ulloasp.mlsuite.schema.adapter.in.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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
import dev.ulloasp.mlsuite.schema.application.dto.SchemaPageDto;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaCatalogUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/schemas")
public class SchemaController {

    private final CurrentUserResolver currentUserResolver;
    private final SchemaCatalogUseCase schemaCatalogUseCase;

    public SchemaController(CurrentUserResolver currentUserResolver, SchemaCatalogUseCase schemaCatalogUseCase) {
        this.currentUserResolver = currentUserResolver;
        this.schemaCatalogUseCase = schemaCatalogUseCase;
    }

    @PostMapping
    public ResponseEntity<SchemaDto> create(Authentication authentication,
            @Valid @RequestBody CreateSchemaRequest request) {
        Schema schema = schemaCatalogUseCase.createSchema(userId(authentication), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(SchemaDto.from(schema));
    }

    @GetMapping
    public ResponseEntity<SchemaPageDto> list(Authentication authentication,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "24") int size,
            @RequestParam(name = "search", defaultValue = "") String search,
            @RequestParam(name = "sort", defaultValue = "updated") String sort,
            @RequestParam(name = "status", defaultValue = "active") String status) {
        return ResponseEntity.ok(schemaCatalogUseCase.getSchemaPage(
                userId(authentication), page, size, search, sort, status));
    }

    @GetMapping("/all")
    public ResponseEntity<List<SchemaDto>> listAll(Authentication authentication) {
        return ResponseEntity.ok(SchemaDto.fromList(schemaCatalogUseCase.listSchemas(userId(authentication))));
    }

    @GetMapping("/{schemaId}")
    public ResponseEntity<SchemaDto> get(Authentication authentication, @PathVariable Long schemaId) {
        return ResponseEntity.ok(SchemaDto.from(schemaCatalogUseCase.getSchema(userId(authentication), schemaId)));
    }

    @PatchMapping("/{schemaId}")
    public ResponseEntity<SchemaDto> rename(Authentication authentication, @PathVariable Long schemaId,
            @RequestParam String name) {
        return ResponseEntity.ok(SchemaDto.from(schemaCatalogUseCase.renameSchema(
                userId(authentication), schemaId, name)));
    }

    @PostMapping("/{schemaId}/archive")
    public ResponseEntity<SchemaDto> archive(Authentication authentication, @PathVariable Long schemaId) {
        return ResponseEntity.ok(SchemaDto.from(schemaCatalogUseCase.archiveSchema(userId(authentication), schemaId)));
    }

    @PostMapping("/{schemaId}/duplicate")
    public ResponseEntity<SchemaDto> duplicate(Authentication authentication, @PathVariable Long schemaId,
            @RequestParam String name) {
        return ResponseEntity.status(HttpStatus.CREATED).body(SchemaDto.from(schemaCatalogUseCase.duplicateSchema(
                userId(authentication), schemaId, name)));
    }

    @DeleteMapping("/{schemaId}")
    public ResponseEntity<Void> delete(Authentication authentication, @PathVariable Long schemaId) {
        schemaCatalogUseCase.deleteSchema(userId(authentication), schemaId);
        return ResponseEntity.noContent().build();
    }

    private Long userId(Authentication authentication) {
        return currentUserResolver.resolve(authentication).userId();
    }
}
