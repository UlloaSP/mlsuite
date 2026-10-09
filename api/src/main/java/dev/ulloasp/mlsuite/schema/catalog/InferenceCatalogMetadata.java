package dev.ulloasp.mlsuite.schema.catalog;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;

import dev.ulloasp.mlsuite.schema.catalog.InferenceRowProjector.Row;

/**
 * Folds the rows of a schema and bookmark scope into its data columns: per schema, its inputs,
 * outputs, then feedback. Rows arrive newest first, so the newest schema leads and a field whose
 * label changed shows its newest label. Only definitions and a bounded list of distinct values are
 * kept, never the rows.
 */
final class InferenceCatalogMetadata {

    /** One more than a value list offers: reaching it tells the client the value has to be typed. */
    private static final int MAX_CHOICES = 51;

    private final InferenceCatalogText text;
    private final Map<String, Column> columns = new LinkedHashMap<>();
    private final Map<Long, Integer> schemaOrder = new LinkedHashMap<>();

    InferenceCatalogMetadata(InferenceCatalogText text) {
        this.text = text;
    }

    void accept(Row row) {
        schemaOrder.putIfAbsent(row.dto().item().schemaId(), schemaOrder.size());
        row.columns().forEach(column -> columns.computeIfAbsent(column.id(), ignored -> new Column(column)));
        row.dto().values().forEach((id, value) -> columns.get(id).add(value, row.dto().displayValues().get(id)));
    }

    List<InferenceCatalogColumnDto> finish() {
        return columns.values().stream()
                .map(Column::dto)
                .sorted(Comparator
                        .comparingInt((InferenceCatalogColumnDto column) -> schemaOrder.get(column.schemaId()))
                        .thenComparingInt(column -> column.group().ordinal()))
                .toList();
    }

    /** A column with what its values say: numeric when every one is a number, and which values it holds. */
    private final class Column {

        private final InferenceCatalogColumnDto definition;
        private final TreeSet<String> choices = new TreeSet<>(
                text.choiceOrder().thenComparing(Comparator.naturalOrder()));
        private boolean numeric = true;
        private boolean valued;

        private Column(InferenceCatalogColumnDto definition) {
            this.definition = definition;
        }

        private void add(Object value, String shown) {
            valued = true;
            numeric &= Double.isFinite(InferenceCatalogValues.number(value));
            if (!shown.isEmpty() && choices.add(shown) && choices.size() > MAX_CHOICES) {
                choices.pollLast();
            }
        }

        private InferenceCatalogColumnDto dto() {
            return new InferenceCatalogColumnDto(definition.id(), definition.group(), definition.label(),
                    definition.schemaId(), definition.schemaName(),
                    valued && numeric ? InferenceValueKind.number : InferenceValueKind.text,
                    List.copyOf(choices));
        }
    }
}
