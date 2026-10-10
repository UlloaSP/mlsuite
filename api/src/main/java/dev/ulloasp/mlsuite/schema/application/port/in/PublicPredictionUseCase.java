package dev.ulloasp.mlsuite.schema.application.port.in;

import dev.ulloasp.mlsuite.schema.application.dto.PublicPredictionRequest;
import dev.ulloasp.mlsuite.schema.application.dto.PublicRunOutcome;
import dev.ulloasp.mlsuite.schema.application.dto.PublicRunQuotaDto;
import dev.ulloasp.mlsuite.security.identity.PublicCaller;

public interface PublicPredictionUseCase {

    /**
     * Runs a published bookmark's models once for anyone, session or not, and keeps the run as
     * the caller's visitor's. The run is counted against the caller's quota for that bookmark
     * and refused once it is used.
     */
    PublicRunOutcome run(String publicId, PublicPredictionRequest request, PublicCaller caller);

    /** How many runs of a published bookmark the caller has left; asking counts nothing. */
    PublicRunQuotaDto quota(String publicId, PublicCaller caller);
}
