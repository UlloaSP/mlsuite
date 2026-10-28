package dev.ulloasp.mlsuite.model.application.dto;

import java.util.List;

import dev.ulloasp.mlsuite.model.domain.model.RuntimeEnvironment;

/**
 * The environment a model runs in: the Python version, the mlbundle release that wrote its bundle
 * and every distribution installed with it. {@code legacy} is the frozen environment of bundles
 * written before locks.
 */
public record RuntimeEnvironmentDto(String key, boolean legacy, String pythonVersion, String writerVersion,
        List<EnvironmentPackageDto> packages) {

    public record EnvironmentPackageDto(String name, String version) {
    }

    public static RuntimeEnvironmentDto toDto(RuntimeEnvironment environment) {
        return new RuntimeEnvironmentDto(environment.getKey(), environment.isLegacy(), environment.getPythonVersion(),
                environment.getWriterVersion(), environment.getPackages().stream()
                        .map(item -> new EnvironmentPackageDto(String.valueOf(item.get("name")),
                                String.valueOf(item.get("version"))))
                        .toList());
    }
}
