package dev.ulloasp.mlsuite.startup;

import java.util.List;

public record StartupReadinessDto(boolean ready, List<Dependency> dependencies) {

    public record Dependency(String name, boolean ready, String message) {
    }
}
