package dev.ulloasp.mlsuite.schema.application.service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultFeedbackRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultFeedbackRevisionRepository;
import dev.ulloasp.mlsuite.schema.catalog.InferenceRows;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedback;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedbackChange;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedbackRevision;
import lombok.RequiredArgsConstructor;

/**
 * The one way answers are written: every answer given, changed or removed is saved together with
 * a revision of its history, so an answer can change or go while what it said stays on record, and
 * counted on the run's stored inferences row, which is no longer current. Callers run inside their
 * own transaction.
 */
@Component
@RequiredArgsConstructor
public class FeedbackHistory {

    private final PredictionResultFeedbackRepository answers;
    private final PredictionResultFeedbackRevisionRepository revisions;
    private final InferenceRows inferenceRows;

    /** Saves a new or changed answer; {@code changedBy} is the member who gave it, null for a visitor. */
    public PredictionResultFeedback save(PredictionResultFeedback answer, Long changedBy) {
        PredictionResultFeedbackChange change = answer.getId() == null
                ? PredictionResultFeedbackChange.CREATED
                : PredictionResultFeedbackChange.UPDATED;
        PredictionResultFeedback saved = answers.saveAndFlush(answer);
        revisions.save(new PredictionResultFeedbackRevision(saved, change, changedBy, now()));
        inferenceRows.answersChanged(saved.getResult().getRun().getId());
        return saved;
    }

    /** Removes answers, recording which member removed each. */
    public void delete(List<PredictionResultFeedback> removed, Long removedBy) {
        OffsetDateTime at = now();
        removed.forEach(answer -> {
            revisions.save(new PredictionResultFeedbackRevision(answer, PredictionResultFeedbackChange.DELETED, removedBy, at));
            inferenceRows.answersChanged(answer.getResult().getRun().getId());
        });
        answers.deleteAll(removed);
    }

    private static OffsetDateTime now() {
        return OffsetDateTime.now(ZoneOffset.UTC);
    }
}
