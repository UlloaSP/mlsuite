package dev.ulloasp.mlsuite.schema.catalog;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.schema.application.dto.PredictionRunCatalogItemDto;
import dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogMetadataDto.Option;
import dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogOrder.Ranked;
import dev.ulloasp.mlsuite.schema.catalog.InferenceRowProjector.Row;
import dev.ulloasp.mlsuite.util.PageDto;
import lombok.RequiredArgsConstructor;

/**
 * The inferences table: its rows, its columns and filter choices, and whole-result selections.
 * Values derived from stored payloads are filtered and sorted before paging, across every persisted
 * snapshot and answer, and every read of one request sees a single snapshot of the data.
 */
@Service
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
@RequiredArgsConstructor
public class InferenceCatalogService {

    private final InferenceCatalogReader reader;

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
        Leading leading = new Leading(order.comparator(), limit);
        reader.scan(userId, scope, table -> projector.project(table).stream()
                .filter(filter::matches)
                .forEach(row -> leading.offer(order.rank(row))));
        List<Long> ids = leading.from((long) request.page() * request.size());
        // Only the page's own rows are projected again in full; the scan kept what ordering needs.
        Map<Long, InferenceCatalogRowDto> rows = new HashMap<>();
        reader.selected(userId, ids, table -> projector.project(table)
                .forEach(row -> rows.put(row.dto().item().id(), row.dto())));
        ids.stream().map(rows::get).forEach(items::add);
        return new PageDto<>(items, request.page(), request.size(), leading.matched(), limit < leading.matched());
    }

    /** The data columns and filter choices of the request's schema and bookmark, whatever else it filters by. */
    public InferenceCatalogMetadataDto metadata(Long userId, InferenceCatalogRequest request) {
        InferenceCatalogText text = InferenceCatalogText.of(request.locale());
        InferenceRowProjector projector = new InferenceRowProjector(text);
        InferenceCatalogMetadata columns = new InferenceCatalogMetadata(text);
        reader.scan(userId, InferenceCatalogScope.columns(request),
                table -> projector.project(table).forEach(columns::accept));
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
        List<Ranked> matched = new ArrayList<>();
        reader.scan(userId, InferenceCatalogScope.rows(request), table -> projector.project(table).stream()
                .filter(filter::matches)
                .forEach(row -> matched.add(order.rank(row))));
        return matched.stream().sorted(order.comparator()).map(Ranked::item).toList();
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
