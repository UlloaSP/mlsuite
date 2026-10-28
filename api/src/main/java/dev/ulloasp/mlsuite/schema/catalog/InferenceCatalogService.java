package dev.ulloasp.mlsuite.schema.catalog;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.schema.application.dto.PredictionRunCatalogItemDto;
import dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogMetadataDto.Option;
import dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogOrder.Key;
import dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogOrder.Ranked;
import dev.ulloasp.mlsuite.schema.catalog.InferenceRowProjector.Row;
import dev.ulloasp.mlsuite.util.PageDto;
import lombok.RequiredArgsConstructor;

/**
 * The inferences table: its rows, its columns and filter choices, and whole-result selections.
 * Values derived from stored payloads are filtered and sorted before paging, across every persisted
 * snapshot and answer, and every read of one request sees a single snapshot of the data. A sort by
 * a derived column alone, and the columns, read each run's stored projection (InferenceRows) and
 * project only the runs whose row is not current; a derived filter still projects the scope. Reads
 * never write: rows are kept current in the background (InferenceRowRefresher).
 */
@Service
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
@RequiredArgsConstructor
public class InferenceCatalogService {

    private final InferenceCatalogReader reader;
    private final InferenceRows rows;

    public PageDto<InferenceCatalogRowDto> page(Long userId, InferenceCatalogRequest request) {
        InferenceCatalogText text = InferenceCatalogText.of(request.locale());
        InferenceRowProjector projector = new InferenceRowProjector(text);
        InferenceCatalogOrder order = InferenceCatalogOrder.of(request.sort(), text);
        InferenceCatalogFilter filter = InferenceCatalogFilter.of(request);
        InferenceCatalogScope scope = InferenceCatalogScope.rows(request);
        long limit = ((long) request.page() + 1) * request.size();
        List<InferenceCatalogRowDto> items = new ArrayList<>();
        if (order.byCreation() && !filter.derived()) {
            long total = reader.page(userId, scope, !order.descending(), request.page(), request.size(),
                    table -> projector.project(table).forEach(row -> items.add(row.dto())));
            return new PageDto<>(items, request.page(), request.size(), total, limit < total);
        }
        if (!order.bySummary() && !filter.derived()) {
            // Ranked by stored rows: only the page's own runs, and runs without a current row, are projected.
            List<Long> ranked = ranked(userId, scope, order, projector);
            int from = (int) Math.min((long) request.page() * request.size(), ranked.size());
            List<Long> pageIds = ranked.subList(from, Math.min(from + request.size(), ranked.size()));
            Map<Long, InferenceCatalogRowDto> projected = new HashMap<>();
            reader.selected(userId, pageIds, table -> projector.project(table)
                    .forEach(row -> projected.put(row.dto().item().id(), row.dto())));
            pageIds.stream().map(projected::get).forEach(items::add);
            return new PageDto<>(items, request.page(), request.size(), ranked.size(), limit < ranked.size());
        }
        Leading leading = new Leading(order.comparator(), limit);
        if (order.bySummary() && !filter.derived()) {
            // Ranked by run summaries alone: no result or answer of the scope is read.
            reader.scanSummaries(userId, scope, summaries -> summaries.forEach(item -> leading.offer(order.rank(item))));
        } else {
            reader.scan(userId, scope, table -> projector.project(table).stream()
                    .filter(filter::matches)
                    .forEach(row -> leading.offer(order.rank(row))));
        }
        List<Long> ids = leading.from((long) request.page() * request.size());
        // Only the page's own rows are projected again in full; the scan kept what ordering needs.
        Map<Long, InferenceCatalogRowDto> projected = new HashMap<>();
        reader.selected(userId, ids, table -> projector.project(table)
                .forEach(row -> projected.put(row.dto().item().id(), row.dto())));
        ids.stream().map(projected::get).forEach(items::add);
        return new PageDto<>(items, request.page(), request.size(), leading.matched(), limit < leading.matched());
    }

    /** The data columns and filter choices of the request's schema and bookmark, whatever else it filters by. */
    public InferenceCatalogMetadataDto metadata(Long userId, InferenceCatalogRequest request) {
        InferenceCatalogText text = InferenceCatalogText.of(request.locale());
        InferenceRowProjector projector = new InferenceRowProjector(text);
        InferenceCatalogMetadata columns = new InferenceCatalogMetadata(text);
        List<Long> ids = reader.ids(userId, InferenceCatalogScope.columns(request));
        Set<Long> stale = rows.stale(ids);
        List<Long> current = ids.stream().filter(id -> !stale.contains(id)).toList();
        // Labels name live things (reviewers, models), so the newest run of each set of columns is projected.
        Set<Long> leaders = new HashSet<>(rows.leaders(current));
        reader.selected(userId, ids.stream().filter(id -> stale.contains(id) || leaders.contains(id)).toList(),
                table -> projector.project(table).forEach(row -> {
                    if (stale.contains(row.dto().item().id())) {
                        columns.accept(row);
                    } else {
                        columns.acceptColumns(row);
                    }
                }));
        rows.distinctValues(current).forEach(value -> columns.acceptValue(value.getKey(), value.getValue()));
        InferenceCatalogReader.Choices choices = reader.choices(userId, InferenceCatalogScope.bookmarks(request));
        Comparator<Option> byLabel = Comparator.comparing(Option::label, text.optionOrder())
                .thenComparing(Option::value);
        return new InferenceCatalogMetadataDto(choices.totalItems(), columns.finish(),
                choices.schemas().stream().sorted(byLabel).toList(),
                choices.bookmarks().stream().sorted(byLabel).toList());
    }

    /** Explicit whole-result selection: a snapshot of identities, independent of loaded pages. */
    public List<PredictionRunCatalogItemDto> selection(Long userId, InferenceCatalogRequest request) {
        InferenceCatalogText text = InferenceCatalogText.of(request.locale());
        InferenceRowProjector projector = new InferenceRowProjector(text);
        InferenceCatalogOrder order = InferenceCatalogOrder.of(request.sort(), text);
        InferenceCatalogFilter filter = InferenceCatalogFilter.of(request);
        if (!order.bySummary() && !filter.derived()) {
            return reader.summaries(userId, ranked(userId, InferenceCatalogScope.rows(request), order, projector));
        }
        List<Ranked> matched = new ArrayList<>();
        if (order.bySummary() && !filter.derived()) {
            reader.scanSummaries(userId, InferenceCatalogScope.rows(request),
                    summaries -> summaries.forEach(item -> matched.add(order.rank(item))));
        } else {
            reader.scan(userId, InferenceCatalogScope.rows(request), table -> projector.project(table).stream()
                    .filter(filter::matches)
                    .forEach(row -> matched.add(order.rank(row))));
        }
        return matched.stream().sorted(order.comparator()).map(Ranked::item).toList();
    }

    /**
     * Every run of a scope in the order of a derived column, the table's order: keys come from stored
     * rows, and from projecting the runs without a current one. The scope arrives newest first, which
     * a stable sort keeps among equal keys.
     */
    private List<Long> ranked(Long userId, InferenceCatalogScope scope, InferenceCatalogOrder order,
            InferenceRowProjector projector) {
        List<Long> ids = reader.ids(userId, scope);
        InferenceRows.Column stored = rows.column(ids, order.column());
        Map<Long, Key> keys = new HashMap<>(ids.size() * 2);
        stored.statuses().forEach((id, status) -> keys.put(id, order.derivedKey(stored.values().get(id), status)));
        reader.selected(userId, ids.stream().filter(stored.stale()::contains).toList(), table -> projector
                .project(table).forEach(row -> keys.put(row.dto().item().id(),
                        order.derivedKey(row.dto().values().get(order.column()), row.dto().feedbackStatus()))));
        List<Long> ranked = new ArrayList<>(ids);
        ranked.sort(Comparator.comparing(keys::get, order.keyOrder()));
        return ranked;
    }

    /** The first rows of an order, found without holding the rest: a heap no larger than the pages asked for. */
    private static final class Leading {

        private final Comparator<Ranked> order;
        private final long limit;
        private final PriorityQueue<Ranked> rows;
        private long matched;

        private Leading(Comparator<Ranked> order, long limit) {
            this.order = order;
            this.limit = limit;
            this.rows = new PriorityQueue<>(order.reversed());
        }

        private void offer(Ranked row) {
            matched++;
            if (rows.size() < limit) {
                rows.add(row);
            } else if (order.compare(row, rows.peek()) < 0) {
                rows.poll();
                rows.add(row);
            }
        }

        private long matched() {
            return matched;
        }

        private List<Long> from(long offset) {
            return rows.stream().sorted(order).skip(offset).map(ranked -> ranked.item().id()).toList();
        }
    }
}
