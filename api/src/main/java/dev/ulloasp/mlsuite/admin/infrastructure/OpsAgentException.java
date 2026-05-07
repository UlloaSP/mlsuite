package dev.ulloasp.mlsuite.admin.infrastructure;

public class OpsAgentException extends RuntimeException {

    private final int status;

    public OpsAgentException(int status, String message) {
        super(message);
        this.status = status;
    }

    public int getStatus() {
        return status;
    }
}
