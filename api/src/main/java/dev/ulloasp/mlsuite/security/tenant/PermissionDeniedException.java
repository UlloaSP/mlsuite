package dev.ulloasp.mlsuite.security.tenant;

public class PermissionDeniedException extends RuntimeException {

    public PermissionDeniedException(String permission) {
        super("Missing required permission '" + permission + "'");
    }
}
