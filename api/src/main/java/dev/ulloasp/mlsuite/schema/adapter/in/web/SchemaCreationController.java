package dev.ulloasp.mlsuite.schema.adapter.in.web;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaWithInitialVersionRequest;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaDto;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaCreationUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/schemas")
@RequiredArgsConstructor
public class SchemaCreationController {

    private final SchemaCreationUseCase schemaCreationUseCase;

    @PostMapping("/with-initial-version")
    public ResponseEntity<SchemaDto> create(CurrentUser user,
            @Valid @RequestBody CreateSchemaWithInitialVersionRequest request) {
        Schema schema = schemaCreationUseCase.createWithInitialVersion(
                user.userId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(SchemaDto.from(schema));
    }
}
