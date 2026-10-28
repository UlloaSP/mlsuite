package dev.ulloasp.mlsuite.schema.domain.exception;

import java.util.List;

import dev.ulloasp.mlsuite.schema.application.dto.SchemaMappingIssueDto;
import lombok.Getter;

/** A schema whose fields or reports map to inputs or outputs its bound models do not have. */
@Getter
public class SchemaMappingException extends RuntimeException {

    private final transient List<SchemaMappingIssueDto> issues;

    public SchemaMappingException(List<SchemaMappingIssueDto> issues) {
        super(issues.size() == 1 ? issues.get(0).message()
                : issues.get(0).message() + " " + (issues.size() - 1)
                        + (issues.size() == 2 ? " more mapping names" : " more mappings name")
                        + " nothing the bound models have.");
        this.issues = List.copyOf(issues);
    }
}
