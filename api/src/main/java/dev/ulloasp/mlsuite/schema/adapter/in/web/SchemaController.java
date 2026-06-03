package dev.ulloasp.mlsuite.schema.adapter.in.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaRequest;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaDto;
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
    public ResponseEntity<List<SchemaDto>> list(Authentication authentication) {
        return ResponseEntity.ok(SchemaDto.fromList(schemaCatalogUseCase.listSchemas(userId(authentication))));
    }

    @GetMapping("/{schemaId}")
    public ResponseEntity<SchemaDto> get(Authentication authentication, @PathVariable Long schemaId) {
        return ResponseEntity.ok(SchemaDto.from(schemaCatalogUseCase.getSchema(userId(authentication), schemaId)));
    }

    private Long userId(Authentication authentication) {
        return currentUserResolver.resolve(authentication).userId();
    }
}
