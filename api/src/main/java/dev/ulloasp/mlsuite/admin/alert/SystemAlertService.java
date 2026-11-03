package dev.ulloasp.mlsuite.admin.alert;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import dev.ulloasp.mlsuite.admin.alert.AlertSettings.Threshold;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SystemAlertService {

    private static final int RECENT = 50;
    private static final String COLUMNS = """
            SELECT id, signal, severity, trigger_value, threshold, latest_value, raised_at, resolved_at
            FROM system_alert""";

    private final JdbcTemplate jdbc;
    private final AlertSignals signals;
    private final AlertSettings settings;

    public SystemAlertsDto overview() {
        AlertSignals.Sample sample = signals.latest();
        Map<SystemAlertSignal, Double> values = sample == null ? Map.of() : sample.values();
        return new SystemAlertsDto(
                sample == null ? null : OffsetDateTime.ofInstant(sample.at(), ZoneOffset.UTC),
                sample == null ? null : sample.opsAgentReporting(),
                Arrays.stream(SystemAlertSignal.values()).map(signal -> signal(signal, values.get(signal))).toList(),
                alerts(COLUMNS + " WHERE resolved_at IS NULL ORDER BY severity, raised_at DESC"),
                alerts(COLUMNS + " WHERE resolved_at IS NOT NULL ORDER BY resolved_at DESC LIMIT " + RECENT));
    }

    private SystemAlertSignalDto signal(SystemAlertSignal signal, Double value) {
        Threshold threshold = settings.threshold(signal);
        return new SystemAlertSignalDto(signal, signal.label(), signal.unit(), value, threshold.warning(),
                threshold.critical(), threshold.clear());
    }

    private List<SystemAlertDto> alerts(String query) {
        return jdbc.query(query, SystemAlertService::alert);
    }

    private static SystemAlertDto alert(ResultSet row, int number) throws SQLException {
        SystemAlertSignal signal = SystemAlertSignal.valueOf(row.getString(2));
        return new SystemAlertDto(row.getLong(1), signal, signal.label(), signal.unit(),
                SystemAlertSeverity.valueOf(row.getString(3)), row.getDouble(4), row.getDouble(5), row.getDouble(6),
                row.getObject(7, OffsetDateTime.class), row.getObject(8, OffsetDateTime.class));
    }
}
