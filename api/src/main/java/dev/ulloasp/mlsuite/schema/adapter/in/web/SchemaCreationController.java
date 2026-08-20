package dev.ulloasp.mlsuite.schema.adapter.in.web;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaWithInitialVersionRequest;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaDto;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaCreationUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/schemas")
public class SchemaCreationController {

    private final CurrentUserResolver currentUserResolver;
    private final SchemaCreationUseCase schemaCreationUseCase;

    public SchemaCreationController(CurrentUserResolver currentUserResolver,
            SchemaCreationUseCase schemaCreationUseCase) {
        this.currentUserResolver = currentUserResolver;
        this.schemaCreationUseCase = schemaCreationUseCase;
    }

    @PostMapping("/with-initial-version")
    public ResponseEntity<SchemaDto> create(Authentication authentication,
            @Valid @RequestBody CreateSchemaWithInitialVersionRequest request) {
        Schema schema = schemaCreationUseCase.createWithInitialVersion(
                currentUserResolver.resolve(authentication).userId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(SchemaDto.from(schema));
    }
}
