package dev.ulloasp.mlsuite.model;

import java.util.ArrayList;
import java.util.List;

import org.hibernate.resource.jdbc.spi.StatementInspector;

/**
 * The SQL Hibernate prepares on a test's thread while the test records it. PublicPredictionFixture
 * registers it as the session factory's statement inspector.
 */
public class RecordedSql implements StatementInspector {

    private static final ThreadLocal<List<String>> RECORDING = new ThreadLocal<>();

    @FunctionalInterface
    public interface Work {
        void run() throws Exception;
    }

    public static List<String> during(Work work) throws Exception {
        List<String> statements = new ArrayList<>();
        RECORDING.set(statements);
        try {
            work.run();
        } finally {
            RECORDING.remove();
        }
        return statements;
    }

    @Override
    public String inspect(String sql) {
        List<String> statements = RECORDING.get();
        if (statements != null) {
            statements.add(sql);
        }
        return sql;
    }
}
