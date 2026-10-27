package dev.ulloasp.mlsuite.schema.application.service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaModelBindingRequest;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaMappingIssueDto;
import dev.ulloasp.mlsuite.schema.domain.exception.SchemaMappingException;
import lombok.RequiredArgsConstructor;

/**
 * Refuses a schema whose mappings name inputs or outputs its bound models do not have, read from
 * each model's persisted schema. A schema is checked when a version is saved (which is also when
 * models are bound to it) and when a change is saved; stored versions are never rewritten.
 */
@Service
@RequiredArgsConstructor
public class SchemaMappingCheck {

    private final ModelRepository modelRepository;

    public void require(Long organizationId, Map<String, Object> formSchema,
            List<CreateSchemaModelBindingRequest> bindings) {
        List<SchemaMappings.Signature> models = bindings.stream()
                .map(binding -> modelRepository.findByIdAndOrganizationId(binding.modelId(), organizationId))
                .flatMap(Optional::stream)
                .map(SchemaMappings.Signature::of)
                .toList();
        List<SchemaMappingIssueDto> issues = SchemaMappings.issues(formSchema, models);
        if (!issues.isEmpty()) throw new SchemaMappingException(issues);
    }
}
