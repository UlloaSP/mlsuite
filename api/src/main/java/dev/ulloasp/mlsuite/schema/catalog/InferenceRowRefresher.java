package dev.ulloasp.mlsuite.schema.catalog;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import dev.ulloasp.mlsuite.schema.catalog.InferenceRowProjector.Row;
import dev.ulloasp.mlsuite.schema.catalog.InferenceRows.Source;

/**
 * Keeps every run's stored projection current, so the inferences table reads rows instead of
 * projecting a scope: after startup it fills the rows runs lack, then the rows of new runs and of
 * runs whose answers or models changed, newest runs first. Readers never wait for it; a run it has
 * not reached yet is projected by the read that needs it.
 */
@Component
class InferenceRowRefresher {

    private static final Logger log = LoggerFactory.getLogger(InferenceRowRefresher.class);
    /** Runs projected and stored in one transaction. */
    static final int BATCH = 500;
    /** Runs looked up at once; a full look means more may be waiting. */
    private static final int LOOK = 5000;

    private final InferenceRows rows;
    private final InferenceCatalogReader reader;
    private final TransactionTemplate transactions;
    // A row holds raw values only, so the locale it is projected in does not matter.
    private final InferenceRowProjector projector = new InferenceRowProjector(InferenceCatalogText.of("und"));

    InferenceRowRefresher(InferenceRows rows, InferenceCatalogReader reader, PlatformTransactionManager transactions) {
        this.rows = rows;
        this.reader = reader;
        this.transactions = new TransactionTemplate(transactions);
    }

    @Scheduled(fixedDelayString = "${mlsuite.inference-rows.refresh-ms}")
    void refresh() {
        try {
            Map<Long, Long> stale;
            do {
                stale = rows.staleRuns(LOOK);
                List<Long> ids = new ArrayList<>(stale.keySet());
                for (int from = 0; from < ids.size(); from += BATCH) {
                    store(ids.subList(from, Math.min(from + BATCH, ids.size())), stale);
                }
            } while (stale.size() == LOOK);
        } catch (RuntimeException failure) {
            log.warn("Inference rows could not be refreshed; reads project the runs left behind", failure);
        }
    }

    /**
     * Projects and stores one batch in one transaction. What each run is projected from is read
     * before its payloads, so a change made meanwhile leaves its row stale, never wrong.
     */
    private void store(List<Long> ids, Map<Long, Long> organizations) {
        Map<Long, List<Long>> byOrganization = new LinkedHashMap<>();
        ids.forEach(id -> byOrganization.computeIfAbsent(organizations.get(id), ignored -> new ArrayList<>()).add(id));
        transactions.executeWithoutResult(status -> {
            Map<Long, Source> sources = rows.sources(ids);
            List<Row> projected = new ArrayList<>(ids.size());
            byOrganization.forEach((organizationId, runs) -> reader.ofOrganization(organizationId, runs,
                    table -> projected.addAll(projector.project(table))));
            rows.store(projected, sources);
        });
    }
}
