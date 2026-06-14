package dev.ulloasp.mlsuite.startup;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.io.IOException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.CannotGetJdbcConnectionException;
import org.springframework.jdbc.core.JdbcTemplate;

import dev.ulloasp.mlsuite.admin.infrastructure.OpsAgentProperties;

class StartupReadinessServiceTest {

    private JdbcTemplate jdbcTemplate;
    private ServiceProbe serviceProbe;
    private StartupReadinessService service;

    @BeforeEach
    void setUp() {
        jdbcTemplate = mock(JdbcTemplate.class);
        serviceProbe = mock(ServiceProbe.class);
        service = new StartupReadinessService(
                jdbcTemplate,
                new OpsAgentProperties("http://ops-agent:8091", "secret"),
                serviceProbe,
                "http://py-analyzer:8000");
        when(jdbcTemplate.queryForObject("SELECT 1", Integer.class)).thenReturn(1);
    }

    @Test
    void check_ReturnsReadyWhenAllDependenciesRespond() {
        StartupReadinessDto readiness = service.check();

        assertTrue(readiness.ready());
        assertTrue(readiness.dependencies().stream().allMatch(StartupReadinessDto.Dependency::ready));
    }

    @Test
    void check_ReturnsNotReadyWhenDatabaseFails() {
        when(jdbcTemplate.queryForObject("SELECT 1", Integer.class))
                .thenThrow(new CannotGetJdbcConnectionException("db down"));

        StartupReadinessDto readiness = service.check();

        assertFalse(readiness.ready());
        assertFalse(readiness.dependencies().stream()
                .filter(dependency -> dependency.name().equals("postgres"))
                .findFirst()
                .orElseThrow()
                .ready());
    }

    @Test
    void check_ReturnsNotReadyWhenAnalyzerFails() throws IOException {
        doThrow(new IOException("analyzer down"))
                .when(serviceProbe)
                .requireOk("http://py-analyzer:8000/health");

        StartupReadinessDto readiness = service.check();

        assertFalse(readiness.ready());
        assertFalse(readiness.dependencies().stream()
                .filter(dependency -> dependency.name().equals("py-analyzer"))
                .findFirst()
                .orElseThrow()
                .ready());
    }

    @Test
    void check_ReturnsNotReadyWhenOpsAgentFails() throws IOException {
        doThrow(new IOException("ops down"))
                .when(serviceProbe)
                .requireOk("http://ops-agent:8091/health");

        StartupReadinessDto readiness = service.check();

        assertFalse(readiness.ready());
        assertFalse(readiness.dependencies().stream()
                .filter(dependency -> dependency.name().equals("ops-agent"))
                .findFirst()
                .orElseThrow()
                .ready());
    }
}
