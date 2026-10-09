package dev.ulloasp.mlsuite.schema.catalog;

import java.util.List;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.util.PageDto;

public record InferenceCatalogRequest(
        int page,
        int size,
        String query,
        String schemaId,
        String bookmarkId,
        String status,
        String feedback,
        String origin,
        String sort,
        String locale,
        List<Condition> conditions) {

    private static final int MAX_CONDITIONS = 100;
    private static final Set<String> OPERATORS = Set.of(
            "is", "contains", "eq", "gt", "gte", "lt", "lte", "empty", "notEmpty");

    public record Condition(String columnId, String operator, String value) {
    }

    public InferenceCatalogRequest {
        page = Math.max(0, page);
        size = PageDto.clampSize(size);
        query = query == null ? "" : InferenceJsValues.trim(query);
        schemaId = defaultValue(schemaId, "all");
        bookmarkId = defaultValue(bookmarkId, "all");
        status = defaultValue(status, "all");
        feedback = defaultValue(feedback, "all");
        origin = defaultValue(origin, "all");
        sort = defaultValue(sort, "createdAt.desc");
        locale = defaultValue(locale, "en-US");
        conditions = conditions == null ? List.of() : conditions;
        if (conditions.size() > MAX_CONDITIONS || conditions.stream().anyMatch(InferenceCatalogRequest::malformed)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid inference conditions");
        }
        conditions = List.copyOf(conditions);
    }

    private static boolean malformed(Condition condition) {
        return condition == null
                || condition.columnId() == null
                || condition.columnId().isBlank()
                || condition.operator() == null
                || !OPERATORS.contains(condition.operator())
                || condition.value() == null;
    }

    private static String defaultValue(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
