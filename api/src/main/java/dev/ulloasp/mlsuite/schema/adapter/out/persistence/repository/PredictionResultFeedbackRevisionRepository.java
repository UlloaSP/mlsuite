package dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedbackRevision;

public interface PredictionResultFeedbackRevisionRepository extends JpaRepository<PredictionResultFeedbackRevision, Long> {

    /** A result's answer history, oldest change first. */
    List<PredictionResultFeedbackRevision> findByResultIdOrderByIdAsc(Long resultId);
}
