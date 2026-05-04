package dev.ulloasp.mlsuite.invitation.domain.exception;

public class InvitationNotFoundException extends RuntimeException {

    public InvitationNotFoundException(String tokenOrId) {
        super("Invitation '" + tokenOrId + "' does not exist.");
    }
}
