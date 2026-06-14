package dev.ulloasp.mlsuite.startup;

import java.io.IOException;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import dev.ulloasp.mlsuite.admin.infrastructure.OpsAgentProperties;
import dev.ulloasp.mlsuite.startup.StartupReadinessDto.Dependency;

@Service
public class StartupReadinessService {

    private final JdbcTemplate jdbcTemplate;
    private final OpsAgentProperties opsAgentProperties;
    private final ServiceProbe serviceProbe;
    private final String analyzerUrl;

    public StartupReadinessService(
            JdbcTemplate jdbcTemplate,
            OpsAgentProperties opsAgentProperties,
            ServiceProbe serviceProbe,
            @Value("${analyzer.url}") String analyzerUrl) {
        this.jdbcTemplate = jdbcTemplate;
        this.opsAgentProperties = opsAgentProperties;
        this.serviceProbe = serviceProbe;
        this.analyzerUrl = analyzerUrl;
    }

    public StartupReadinessDto check() {
        List<Dependency> dependencies = List.of(
                database(),
                probe("py-analyzer", analyzerUrl + "/health"),
                probe("ops-agent", opsAgentProperties.baseUrl() + "/health"));
        boolean ready = dependencies.stream().allMatch(Dependency::ready);
        return new StartupReadinessDto(ready, dependencies);
    }

    private Dependency database() {
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            return new Dependency("postgres", true, "ready");
        } catch (RuntimeException ex) {
            return new Dependency("postgres", false, safeMessage(ex));
        }
    }

    private Dependency probe(String name, String url) {
        try {
            serviceProbe.requireOk(url);
            return new Dependency(name, true, "ready");
        } catch (IOException ex) {
            return new Dependency(name, false, safeMessage(ex));
        }
    }

    private String safeMessage(Exception ex) {
        String message = ex.getMessage();
        return message == null || message.isBlank() ? "unavailable" : message;
    }
}
