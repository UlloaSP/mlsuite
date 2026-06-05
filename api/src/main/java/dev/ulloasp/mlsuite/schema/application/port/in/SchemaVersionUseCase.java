package dev.ulloasp.mlsuite.schema.application.port.in;

import java.util.List;

import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaModelBindingRequest;
import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaVersionRequest;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaModelBinding;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;

public interface SchemaVersionUseCase {
    SchemaVersion createVersion(Long userId, Long schemaId, CreateSchemaVersionRequest request);

    List<SchemaVersion> listVersions(Long userId, Long schemaId);

    SchemaVersion getVersion(Long userId, Long versionId);

    SchemaModelBinding addBinding(Long userId, Long versionId, CreateSchemaModelBindingRequest request);

    List<SchemaModelBinding> listBindings(Long userId, Long versionId);
}
