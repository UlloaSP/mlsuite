package dev.ulloasp.mlsuite.schema.adapter.in.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SchemaVersionController {

    private final SchemaVersionUseCase schemaVersionUseCase;

    @PostMapping("/schemas/{schemaId}/versions")
    public ResponseEntity<SchemaVersionDto> create(CurrentUser user, @PathVariable Long schemaId,
            @Valid @RequestBody CreateSchemaVersionRequest request) {
        Long userId = user.userId();
        SchemaVersion version = schemaVersionUseCase.createVersion(userId, schemaId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(userId, version));
    }

    @GetMapping("/schemas/{schemaId}/versions")
    public ResponseEntity<List<SchemaVersionDto>> list(CurrentUser user, @PathVariable Long schemaId) {
        Long userId = user.userId();
        return ResponseEntity.ok(schemaVersionUseCase.listVersions(userId, schemaId).stream()
                .map(version -> toDto(userId, version))
                .toList());
    }

    @GetMapping("/schema-versions/{versionId}")
    public ResponseEntity<SchemaVersionDto> get(CurrentUser user, @PathVariable Long versionId) {
        Long userId = user.userId();
        return ResponseEntity.ok(toDto(userId, schemaVersionUseCase.getVersion(userId, versionId)));
    }

    @PostMapping("/schema-versions/{versionId}/bindings")
    public ResponseEntity<SchemaModelBindingDto> addBinding(CurrentUser user, @PathVariable Long versionId,
            @Valid @RequestBody CreateSchemaModelBindingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(SchemaModelBindingDto.from(
                schemaVersionUseCase.addBinding(user.userId(), versionId, request)));
    }

    @GetMapping("/schema-versions/{versionId}/bindings")
    public ResponseEntity<List<SchemaModelBindingDto>> listBindings(CurrentUser user,
            @PathVariable Long versionId) {
        return ResponseEntity.ok(SchemaModelBindingDto.fromList(
                schemaVersionUseCase.listBindings(user.userId(), versionId)));
    }

    private SchemaVersionDto toDto(Long userId, SchemaVersion version) {
        return SchemaVersionDto.from(version, schemaVersionUseCase.listBindings(userId, version.getId()));
    }
}
