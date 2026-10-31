package dev.ulloasp.mlsuite.schema.application.service;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultFeedbackRepository;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedback;
import lombok.RequiredArgsConstructor;

/**
 * Removes runs a member may run predictions on, wherever they stand: each leaves the reviews it is
 * in, which go on with the runs they have left. An answer's removal stays on record in a DELETED
 * revision; what it said goes with the run. The results are locked first, so an answer given while
 * this runs either commits before it is read here or is refused. Runs in the caller's transaction.
 */
@Component
@RequiredArgsConstructor
public class PredictionRunDeletion {

    private final PredictionResultFeedbackRepository answers;
    private final FeedbackHistory history;
    private final NamedParameterJdbcTemplate jdbc;

    public record Deleted(int answers, int reviews) {
    }

    public Deleted delete(Long actorUserId, List<Long> runIds) {
        Map<String, List<Long>> runs = Map.of("runs", runIds);
        jdbc.query("SELECT id FROM prediction_result WHERE prediction_run_id IN (:runs) ORDER BY id FOR UPDATE", runs,
                (rs, n) -> rs.getLong(1));
        List<PredictionResultFeedback> given = answers.findByResultRunIdIn(runIds);
        history.delete(given, actorUserId);
        answers.flush();
        Set<Long> reviews = new HashSet<>(jdbc.queryForList(
                "SELECT schema_review_id FROM schema_review_run WHERE prediction_run_id IN (:runs)", runs, Long.class));
        jdbc.update("""
                DELETE FROM schema_review_run_submission WHERE schema_review_run_id IN (
                    SELECT id FROM schema_review_run WHERE prediction_run_id IN (:runs))""", runs);
        jdbc.update("DELETE FROM schema_review_run WHERE prediction_run_id IN (:runs)", runs);
        jdbc.update("""
                DELETE FROM prediction_result_feedback_revision WHERE change <> 'DELETED' AND prediction_result_id IN (
                    SELECT id FROM prediction_result WHERE prediction_run_id IN (:runs))""", runs);
        jdbc.update("DELETE FROM prediction_result WHERE prediction_run_id IN (:runs)", runs);
        jdbc.update("DELETE FROM prediction_run WHERE id IN (:runs)", runs);
        return new Deleted(given.size(), reviews.size());
    }
}
