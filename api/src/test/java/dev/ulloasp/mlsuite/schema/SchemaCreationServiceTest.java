package dev.ulloasp.mlsuite.schema;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaModelBindingRequest;
import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaRequest;
import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaVersionRequest;
import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaWithInitialVersionRequest;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaCatalogUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaVersionUseCase;
import dev.ulloasp.mlsuite.schema.application.service.SchemaCreationService;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;

@ExtendWith(MockitoExtension.class)
class SchemaCreationServiceTest {

    @Mock private SchemaCatalogUseCase schemaCatalogUseCase;
    @Mock private SchemaVersionUseCase schemaVersionUseCase;
    @InjectMocks private SchemaCreationService service;

    @Test
    void createsSchemaAndInitialVersionAsOneCommand() {
        CreateSchemaWithInitialVersionRequest request = request();
        Schema schema = new Schema();
        schema.setId(12L);
        when(schemaCatalogUseCase.createSchema(7L, request.schema())).thenReturn(schema);

        assertSame(schema, service.createWithInitialVersion(7L, request));

        verify(schemaVersionUseCase).createVersion(7L, 12L, request.initialVersion());
    }

    @Test
    void stopsWhenSchemaCreationFails() {
        CreateSchemaWithInitialVersionRequest request = request();
        RuntimeException failure = new RuntimeException("schema failed");
        when(schemaCatalogUseCase.createSchema(7L, request.schema())).thenThrow(failure);

        assertSame(failure, assertThrows(RuntimeException.class,
                () -> service.createWithInitialVersion(7L, request)));
        verify(schemaVersionUseCase, never()).createVersion(7L, 12L, request.initialVersion());
    }

    @Test
    void propagatesInitialVersionFailureForTransactionRollback() {
        CreateSchemaWithInitialVersionRequest request = request();
        Schema schema = new Schema();
        schema.setId(12L);
        RuntimeException failure = new RuntimeException("version failed");
        when(schemaCatalogUseCase.createSchema(7L, request.schema())).thenReturn(schema);
        when(schemaVersionUseCase.createVersion(7L, 12L, request.initialVersion())).thenThrow(failure);

        assertSame(failure, assertThrows(RuntimeException.class,
                () -> service.createWithInitialVersion(7L, request)));
    }

    private CreateSchemaWithInitialVersionRequest request() {
        return new CreateSchemaWithInitialVersionRequest(
                new CreateSchemaRequest("Risk", null),
                new CreateSchemaVersionRequest("v1", Map.of("fields", List.of()),
                        List.of(new CreateSchemaModelBindingRequest(3L, Map.of()))));
    }
}
