package dev.ulloasp.mlsuite.schema.catalog;

import java.util.List;
import java.util.Locale;

import dev.ulloasp.mlsuite.schema.catalog.InferenceRowProjector.Row;

/**
 * The filters only a projected row can answer: the search, the feedback status and column
 * conditions. Schema, bookmark, status and origin belong to {@link InferenceCatalogScope}.
 */
final class InferenceCatalogFilter {

    private static final String ALL = "all";

    private final String query;
    private final String feedback;
    private final List<Condition> conditions;

    /** One column condition with its value read once, e.g. age &gt; 40 or prediction is "Yes". */
    private record Condition(String columnId, String operator, String value, String contained, double number) {

        private static Condition of(InferenceCatalogRequest.Condition condition) {
            return new Condition(condition.columnId(), condition.operator(), condition.value(),
                    InferenceJsValues.trim(condition.value()).toLowerCase(Locale.ROOT),
                    InferenceCatalogValues.number(condition.value()));
        }

        private boolean matches(Row row) {
            String text = row.dto().displayValues().getOrDefault(columnId, "");
            return switch (operator) {
                case "empty" -> text.isEmpty();
                case "notEmpty" -> !text.isEmpty();
                case "is" -> text.equals(value);
                case "contains" -> text.toLowerCase(Locale.ROOT).contains(contained);
                default -> compares(InferenceCatalogValues.number(row.dto().values().get(columnId)));
            };
        }

        private boolean compares(double cell) {
            if (!Double.isFinite(cell) || !Double.isFinite(number)) {
                return false;
            }
            return switch (operator) {
                case "eq" -> cell == number;
                case "gt" -> cell > number;
                case "gte" -> cell >= number;
                case "lt" -> cell < number;
                case "lte" -> cell <= number;
                default -> false;
            };
        }
    }

    private InferenceCatalogFilter(String query, String feedback, List<Condition> conditions) {
        this.query = query;
        this.feedback = feedback;
        this.conditions = conditions;
    }

    static InferenceCatalogFilter of(InferenceCatalogRequest request) {
        return new InferenceCatalogFilter(request.query().toLowerCase(Locale.ROOT), request.feedback(),
                request.conditions().stream().map(Condition::of).toList());
    }

    /** Whether any filter needs projected rows, so the database cannot page the result by itself. */
    boolean derived() {
        return !query.isEmpty() || !ALL.equals(feedback) || !conditions.isEmpty();
    }

    boolean matches(Row row) {
        return row.searchText().contains(query)
                && (ALL.equals(feedback) || row.dto().feedbackStatus().name().equals(feedback))
                && conditions.stream().allMatch(condition -> condition.matches(row));
    }
}
