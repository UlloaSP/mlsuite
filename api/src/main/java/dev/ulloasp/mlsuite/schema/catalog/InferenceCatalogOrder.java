package dev.ulloasp.mlsuite.schema.catalog;

import java.time.Instant;
import java.util.Comparator;

import com.ibm.icu.text.CollationKey;

import dev.ulloasp.mlsuite.schema.application.dto.PredictionRunCatalogItemDto;
import dev.ulloasp.mlsuite.schema.catalog.InferenceRowProjector.Row;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunOrigin;

/**
 * The table's order by one column, e.g. "createdAt.desc". Rows that tie, or that both lack the
 * column, keep the table's own order: newest first, then by id. That makes every order total, so
 * pages never overlap.
 */
final class InferenceCatalogOrder {

    private static final String CREATED_AT = "createdAt";
    private static final Comparator<Ranked> NEWEST_FIRST = Comparator
            .comparing((Ranked ranked) -> ranked.createdAt()).reversed()
            .thenComparing(ranked -> ranked.item().id());

    private final String column;
    private final boolean descending;
    private final InferenceCatalogText text;

    /**
     * A row's value in the sorted column, compared the way the table compared cells: two numbers by
     * value, anything else by its displayed text. Numbers come before text, which is what keeps a
     * column holding both in one consistent order.
     */
    record Key(boolean numeric, double number, CollationKey text) implements Comparable<Key> {

        @Override
        public int compareTo(Key other) {
            if (numeric != other.numeric) {
                return numeric ? -1 : 1;
            }
            if (!numeric) {
                return text.compareTo(other.text);
            }
            return number < other.number ? -1 : number > other.number ? 1 : 0;
        }
    }

    /** A row reduced to what ordering needs, so sorting a whole scope never holds every projected cell. */
    record Ranked(PredictionRunCatalogItemDto item, Key key) {

        private Instant createdAt() {
            return item.createdAt().toInstant();
        }
    }

    private InferenceCatalogOrder(String column, boolean descending, InferenceCatalogText text) {
        this.column = column;
        this.descending = descending;
        this.text = text;
    }

    /** Column ids may contain dots themselves, so the direction is what follows the last one. */
    static InferenceCatalogOrder of(String sort, InferenceCatalogText text) {
        int split = sort.lastIndexOf('.');
        String direction = sort.substring(split + 1);
        boolean readable = split > 0 && (direction.equals("asc") || direction.equals("desc"));
        return readable
                ? new InferenceCatalogOrder(sort.substring(0, split), direction.equals("desc"), text)
                : new InferenceCatalogOrder(CREATED_AT, true, text);
    }

    /** Whether the order is by creation time, which the database can page by itself. */
    boolean byCreation() {
        return column.equals(CREATED_AT);
    }

    boolean descending() {
        return descending;
    }

    Ranked rank(Row row) {
        return new Ranked(row.dto().item(), byCreation() ? null : key(row));
    }

    Comparator<Ranked> comparator() {
        if (byCreation()) {
            return descending ? NEWEST_FIRST : Comparator.comparing(Ranked::createdAt).thenComparing(NEWEST_FIRST);
        }
        Comparator<Ranked> byColumn = (left, right) -> {
            // A row without the column goes last in either direction.
            if (left.key() == null || right.key() == null) {
                return left.key() == right.key() ? 0 : left.key() == null ? 1 : -1;
            }
            int comparison = left.key().compareTo(right.key());
            return descending ? -comparison : comparison;
        };
        return byColumn.thenComparing(NEWEST_FIRST);
    }

    private Key key(Row row) {
        PredictionRunCatalogItemDto item = row.dto().item();
        return switch (column) {
            case "name" -> text(item.name());
            case "status" -> text(item.status().name());
            case "feedbackStatus" -> text(row.dto().feedbackStatus().name());
            case "schema" -> text(item.schemaName());
            case "version" -> new Key(true, item.schemaVersion(), null);
            case "bookmark" -> text(item.bookmarkName());
            case "author" -> text(author(item));
            case "origin" -> text(item.origin() == PredictionRunOrigin.PUBLIC ? "Public page" : "Workspace");
            default -> row.dto().values().get(column) instanceof Number number
                    ? new Key(true, number.doubleValue(), null)
                    : text(row.dto().displayValues().get(column));
        };
    }

    private Key text(String value) {
        return value == null ? null : new Key(false, 0, text.cellKey(text.format(value)));
    }

    /** Who made the run: a member by name or address, or a visitor of the public page, who has none. */
    private static String author(PredictionRunCatalogItemDto item) {
        if (item.createdByName() != null && !item.createdByName().isEmpty()) {
            return item.createdByName();
        }
        if (item.createdByEmail() != null && !item.createdByEmail().isEmpty()) {
            return item.createdByEmail();
        }
        return item.origin() == PredictionRunOrigin.PUBLIC ? "Visitor" : null;
    }
}
