package dev.ulloasp.mlsuite.admin.alert;

/**
 * What the platform watches about itself, one concern each, so at most one alert is open per
 * signal. An alert and its notifications keep {@code label} and {@code unit}, the words that draw
 * them; a signal with no unit is a state rather than a measure.
 */
public enum SystemAlertSignal {
    PREDICTION_ROWS_PENDING("Prediction rows waiting", "rows"),
    PREDICTION_OLDEST_AGE("Oldest open bulk upload", "seconds"),
    MODELS_PREPARING("Models waiting for preparation", "models"),
    RUNTIME_QUEUE("Runs waiting for the runtime", "runs"),
    RUNTIME_REJECTIONS("Runs turned away by the runtime", "per minute"),
    STORAGE_DELETIONS_FAILED("Storage deletions that failed", "tasks"),
    HOST_CPU("CPU", "%"),
    HOST_RAM("Memory", "%"),
    HOST_DISK("Disk", "%"),
    OPS_AGENT("Ops agent not reporting", "");

    private final String label;
    private final String unit;

    SystemAlertSignal(String label, String unit) {
        this.label = label;
        this.unit = unit;
    }

    public String label() {
        return label;
    }

    public String unit() {
        return unit;
    }
}
