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

import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaModelBindingRequest;
import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaVersionRequest;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaModelBindingDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaVersionDto;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaVersionUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
public class SchemaVersionController {

    private final CurrentUserResolver currentUserResolver;
    private final SchemaVersionUseCase schemaVersionUseCase;

    public SchemaVersionController(CurrentUserResolver currentUserResolver,
            SchemaVersionUseCase schemaVersionUseCase) {
        this.currentUserResolver = currentUserResolver;
        this.schemaVersionUseCase = schemaVersionUseCase;
    }

    @PostMapping("/schemas/{schemaId}/versions")
    public ResponseEntity<SchemaVersionDto> create(Authentication authentication, @PathVariable Long schemaId,
            @Valid @RequestBody CreateSchemaVersionRequest request) {
        Long userId = userId(authentication);
        SchemaVersion version = schemaVersionUseCase.createVersion(userId, schemaId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(userId, version));
    }

    @GetMapping("/schemas/{schemaId}/versions")
    public ResponseEntity<List<SchemaVersionDto>> list(Authentication authentication, @PathVariable Long schemaId) {
        Long userId = userId(authentication);
        return ResponseEntity.ok(schemaVersionUseCase.listVersions(userId, schemaId).stream()
                .map(version -> toDto(userId, version))
                .toList());
    }

    @GetMapping("/schema-versions/{versionId}")
    public ResponseEntity<SchemaVersionDto> get(Authentication authentication, @PathVariable Long versionId) {
        Long userId = userId(authentication);
        return ResponseEntity.ok(toDto(userId, schemaVersionUseCase.getVersion(userId, versionId)));
    }

    @PostMapping("/schema-versions/{versionId}/bindings")
    public ResponseEntity<SchemaModelBindingDto> addBinding(Authentication authentication, @PathVariable Long versionId,
            @Valid @RequestBody CreateSchemaModelBindingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(SchemaModelBindingDto.from(
                schemaVersionUseCase.addBinding(userId(authentication), versionId, request)));
    }

    @GetMapping("/schema-versions/{versionId}/bindings")
    public ResponseEntity<List<SchemaModelBindingDto>> listBindings(Authentication authentication,
            @PathVariable Long versionId) {
        return ResponseEntity.ok(SchemaModelBindingDto.fromList(
                schemaVersionUseCase.listBindings(userId(authentication), versionId)));
    }

    private SchemaVersionDto toDto(Long userId, SchemaVersion version) {
        return SchemaVersionDto.from(version, schemaVersionUseCase.listBindings(userId, version.getId()));
    }

    private Long userId(Authentication authentication) {
        return currentUserResolver.resolve(authentication).userId();
    }
}
