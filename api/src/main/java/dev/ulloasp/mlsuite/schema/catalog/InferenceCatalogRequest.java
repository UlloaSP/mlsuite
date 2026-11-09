package dev.ulloasp.mlsuite.schema.catalog;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Stream;

import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunOrigin;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunStatus;
import dev.ulloasp.mlsuite.util.CatalogValues;
import dev.ulloasp.mlsuite.util.PageDto;

/** The inference table's query. A missing page or size keeps its default, as in every catalog. */
public record InferenceCatalogRequest(
        Integer page,
        Integer size,
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
    private static final String ALL = "all";
    private static final List<String> STATUSES = choices(PredictionRunStatus.values());
    private static final List<String> FEEDBACK = choices(InferenceFeedbackStatus.values());
    private static final List<String> ORIGINS = choices(PredictionRunOrigin.values());
    private static final List<String> OPERATORS = List.of(
            "is", "contains", "eq", "gt", "gte", "lt", "lte", "empty", "notEmpty");

    public record Condition(String columnId, String operator, String value) {
    }

    public InferenceCatalogRequest {
        page = page == null ? 0 : PageDto.page(page);
        size = size == null ? PageDto.DEFAULT_SIZE : PageDto.size(size);
        query = query == null ? "" : InferenceJsValues.trim(query);
        schemaId = id("schemaId", defaultValue(schemaId, ALL), ALL);
        bookmarkId = id("bookmarkId", defaultValue(bookmarkId, ALL), ALL, "unbookmarked");
        status = CatalogValues.require("status", defaultValue(status, ALL), STATUSES);
        feedback = CatalogValues.require("feedback", defaultValue(feedback, ALL), FEEDBACK);
        origin = CatalogValues.require("origin", defaultValue(origin, ALL), ORIGINS);
        sort = sort(defaultValue(sort, "createdAt.desc"));
        locale = defaultValue(locale, "en-US");
        conditions = conditions == null ? List.of() : conditions;
        if (conditions.size() > MAX_CONDITIONS) {
            throw new IllegalArgumentException(
                    "Too many conditions: " + conditions.size() + "; expected at most " + MAX_CONDITIONS);
        }
        conditions.forEach(InferenceCatalogRequest::requireWellFormed);
        conditions = List.copyOf(conditions);
    }

    private static void requireWellFormed(Condition condition) {
        if (condition == null || condition.columnId() == null || condition.columnId().isBlank()
                || condition.value() == null) {
            throw new IllegalArgumentException("Invalid condition; expected a columnId, an operator and a value");
        }
        CatalogValues.require("condition operator", condition.operator(), OPERATORS);
    }

    /** A column id and a direction after its last dot; column ids may contain dots themselves. */
    private static String sort(String sort) {
        int split = sort.lastIndexOf('.');
        String direction = sort.substring(split + 1);
        if (split > 0 && (direction.equals("asc") || direction.equals("desc"))) {
            return sort;
        }
        throw new IllegalArgumentException("Unknown sort '" + sort + "'; expected <column>.asc or <column>.desc");
    }

    /** A numeric id, or one of the named choices. */
    private static String id(String parameter, String value, String... named) {
        if (Arrays.asList(named).contains(value)) {
            return value;
        }
        try {
            Long.parseLong(value);
            return value;
        } catch (NumberFormatException notAnId) {
            throw CatalogValues.unknown(parameter, value,
                    Stream.concat(Arrays.stream(named), Stream.of("<id>")).toList());
        }
    }

    private static List<String> choices(Enum<?>[] values) {
        return Stream.concat(Stream.of(ALL), Arrays.stream(values).map(Enum::name)).toList();
    }

    private static String defaultValue(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
