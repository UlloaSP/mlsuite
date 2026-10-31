package dev.ulloasp.mlsuite.admin.alert;

import java.time.Instant;

/** An alert not yet resolved, as the evaluator needs it. */
record OpenSystemAlert(long id, SystemAlertSignal signal, SystemAlertSeverity severity, Instant heldAt) {
}
