package dev.ulloasp.mlsuite.search.application.service;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;

import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class SearchIndexInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SearchIndexInitializer.class);

    private static final List<String> STATEMENTS = List.of(
            "CREATE EXTENSION IF NOT EXISTS pg_trgm",
            "CREATE INDEX IF NOT EXISTS idx_search_org_name_trgm ON organization USING GIN (lower(name) gin_trgm_ops)",
            "CREATE INDEX IF NOT EXISTS idx_search_org_slug_trgm ON organization USING GIN (lower(slug) gin_trgm_ops)",
            "CREATE INDEX IF NOT EXISTS idx_search_team_name_trgm ON team USING GIN (lower(name) gin_trgm_ops)",
            "CREATE INDEX IF NOT EXISTS idx_search_team_slug_trgm ON team USING GIN (lower(slug) gin_trgm_ops)",
            "CREATE INDEX IF NOT EXISTS idx_search_model_name_trgm ON model USING GIN (lower(name) gin_trgm_ops)",
            "CREATE INDEX IF NOT EXISTS idx_search_model_file_trgm ON model USING GIN (lower(file_name) gin_trgm_ops)",
            "CREATE INDEX IF NOT EXISTS idx_search_schema_name_trgm ON schema_artifact USING GIN (lower(name) gin_trgm_ops)",
            "CREATE INDEX IF NOT EXISTS idx_search_run_name_trgm ON prediction_run USING GIN (lower(name) gin_trgm_ops)",
            "CREATE INDEX IF NOT EXISTS idx_search_plugin_file_trgm ON plugin_metadata USING GIN (lower(file_name) gin_trgm_ops)",
            "CREATE INDEX IF NOT EXISTS idx_search_plugin_kind_trgm ON plugin_metadata USING GIN (lower(kind) gin_trgm_ops)");

    private final DataSource dataSource;
    private final JdbcTemplate jdbcTemplate;

    public SearchIndexInitializer(DataSource dataSource, JdbcTemplate jdbcTemplate) {
        this.dataSource = dataSource;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!isPostgres()) {
            return;
        }
        for (String statement : STATEMENTS) {
            try {
                jdbcTemplate.execute(statement);
            } catch (DataAccessException ex) {
                log.warn("Could not initialize search index: {}", statement, ex);
                return;
            }
        }
    }

    private boolean isPostgres() {
        try (Connection connection = dataSource.getConnection()) {
            return connection.getMetaData().getDatabaseProductName().toLowerCase().contains("postgresql");
        } catch (SQLException ex) {
            log.warn("Could not detect database product for search indexes.", ex);
            return false;
        }
    }
}
