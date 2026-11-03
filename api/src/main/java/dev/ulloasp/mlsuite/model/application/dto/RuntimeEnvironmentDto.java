package dev.ulloasp.mlsuite.model.application.dto;

import java.util.List;

import dev.ulloasp.mlsuite.model.domain.model.RuntimeEnvironment;

/**
 * The environment a model runs in: the Python version, the mlbundle release that wrote its bundle
 * and every distribution installed with it.
 */
public record RuntimeEnvironmentDto(String key, String pythonVersion, String writerVersion,
        List<EnvironmentPackageDto> packages) {

    public record EnvironmentPackageDto(String name, String version) {
    }

    public static RuntimeEnvironmentDto toDto(RuntimeEnvironment environment) {
        return new RuntimeEnvironmentDto(environment.getKey(), environment.getPythonVersion(),
                environment.getWriterVersion(), environment.getPackages().stream()
                        .map(item -> new EnvironmentPackageDto(String.valueOf(item.get("name")),
                                String.valueOf(item.get("version"))))
                        .toList());
    }
}
