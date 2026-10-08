package dev.ulloasp.mlsuite.schema.application.port.in;

import java.util.List;

import dev.ulloasp.mlsuite.schema.application.dto.PublicRunDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicRunFeedbackRequest;
import dev.ulloasp.mlsuite.security.identity.PublicCaller;

/** The runs a caller made on a public page, read back and reviewed by the browser that made them. */
public interface PublicRunUseCase {

    /** The caller's runs of the bookmark, newest first; none without a known visitor cookie. */
    List<PublicRunDto> list(String publicId, PublicCaller caller);

    /** One of the caller's runs; another caller's, or one of another bookmark, is not found. */
    PublicRunDto get(String publicId, Long runId, PublicCaller caller);

    /** Replaces the caller's answers about the run's reports, one per report key and type. */
    PublicRunDto saveFeedback(String publicId, Long runId, PublicRunFeedbackRequest request, PublicCaller caller);
}
