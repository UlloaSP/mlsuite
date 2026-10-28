package dev.ulloasp.mlsuite.model.domain.model;

/**
 * Whether a model can run: its environment is built and the model loaded there (READY), that is
 * still under way (PREPARING), or it could not be done (FAILED, with the reason).
 */
public enum ModelRuntimeState {
    PREPARING,
    READY,
    FAILED
}
