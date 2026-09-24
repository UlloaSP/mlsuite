package dev.ulloasp.mlsuite.storage;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

@ConfigurationProperties(prefix = "artifact.migration")
@Validated
public class ArtifactMigrationProperties {

    @NotBlank
    private String command = "status";

    @Min(1)
    private int maxAttempts = 5;

    @Min(1)
    private long staleAfterSeconds = 900;

    @Min(60)
    private long orphanGraceSeconds = 86400;

    public String getCommand() { return command; }
    public void setCommand(String command) { this.command = command; }
    public int getMaxAttempts() { return maxAttempts; }
    public void setMaxAttempts(int maxAttempts) { this.maxAttempts = maxAttempts; }
    public long getStaleAfterSeconds() { return staleAfterSeconds; }
    public void setStaleAfterSeconds(long staleAfterSeconds) { this.staleAfterSeconds = staleAfterSeconds; }
    public long getOrphanGraceSeconds() { return orphanGraceSeconds; }
    public void setOrphanGraceSeconds(long orphanGraceSeconds) { this.orphanGraceSeconds = orphanGraceSeconds; }
}
