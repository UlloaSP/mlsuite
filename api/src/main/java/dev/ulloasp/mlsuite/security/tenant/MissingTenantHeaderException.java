package dev.ulloasp.mlsuite.security.tenant;

public class MissingTenantHeaderException extends RuntimeException {

    public MissingTenantHeaderException(String headerName) {
        super("Missing required tenant header '" + headerName + "'");
    }
}
