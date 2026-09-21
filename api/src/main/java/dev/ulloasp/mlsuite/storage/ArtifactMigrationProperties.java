package dev.ulloasp.mlsuite.storage;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.UUID;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "artifact.migration")
public class ArtifactMigrationProperties {

    private String command = "status";
    private int batchSize = 10;
    private int maxAttempts = 5;
    private long staleAfterSeconds = 900;
    private String workerId;

    public String effectiveWorkerId() {
        if (workerId != null && !workerId.isBlank()) {
            return workerId;
        }
        try {
            return InetAddress.getLocalHost().getHostName() + "-" + UUID.randomUUID();
        } catch (UnknownHostException ex) {
            return "worker-" + UUID.randomUUID();
        }
    }

    public String getCommand() { return command; }
    public void setCommand(String command) { this.command = command; }
    public int getBatchSize() { return batchSize; }
    public void setBatchSize(int batchSize) { this.batchSize = batchSize; }
    public int getMaxAttempts() { return maxAttempts; }
    public void setMaxAttempts(int maxAttempts) { this.maxAttempts = maxAttempts; }
    public long getStaleAfterSeconds() { return staleAfterSeconds; }
    public void setStaleAfterSeconds(long staleAfterSeconds) { this.staleAfterSeconds = staleAfterSeconds; }
    public String getWorkerId() { return workerId; }
    public void setWorkerId(String workerId) { this.workerId = workerId; }
}
