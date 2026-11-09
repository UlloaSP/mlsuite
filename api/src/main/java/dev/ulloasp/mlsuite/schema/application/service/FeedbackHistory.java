package dev.ulloasp.mlsuite.schema.application.service;

import dev.ulloasp.mlsuite.principal.domain.model.Principal;
import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultFeedbackRepository;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedback;
import lombok.RequiredArgsConstructor;

/**
 * The one way answers are written. The database keeps their history by itself: each change of an
 * answer adds a revision naming who made it, which for a removal is the principal this transaction
 * names. Callers run inside their own transaction.
 */
@Component
@RequiredArgsConstructor
public class FeedbackHistory {

    private final PredictionResultFeedbackRepository answers;
    private final JdbcTemplate jdbc;

    /** Saves a new or changed answer; {@code changedBy} is whoever gave it, a member or a visitor. */
    public PredictionResultFeedback save(PredictionResultFeedback answer, Principal changedBy) {
        answer.setUpdatedBy(changedBy);
        return answers.saveAndFlush(answer);
    }

    /** Removes answers, recording who removed each. */
    public void delete(List<PredictionResultFeedback> removed, Principal removedBy) {
        actAs(removedBy);
        answers.deleteAll(removed);
        answers.flush();
    }

    /** Names who removes answers in this transaction, for the revisions the database writes. */
    private void actAs(Principal principal) {
        jdbc.queryForObject("SELECT set_config('app.principal_id', ?, true)", String.class, principal.getId().toString());
    }
}
