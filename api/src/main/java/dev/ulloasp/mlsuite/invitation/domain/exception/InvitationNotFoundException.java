package dev.ulloasp.mlsuite.invitation.domain.exception;

public class InvitationNotFoundException extends RuntimeException {

    public InvitationNotFoundException(Long id) {
        super("Invitation '" + id + "' does not exist.");
    }
}
