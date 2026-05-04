package dev.ulloasp.mlsuite.team.domain.exception;

public class TeamNotFoundException extends RuntimeException {

    public TeamNotFoundException(Long teamId) {
        super("Team '" + teamId + "' does not exist.");
    }
}
