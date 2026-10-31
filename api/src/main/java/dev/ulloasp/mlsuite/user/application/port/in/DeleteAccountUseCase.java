package dev.ulloasp.mlsuite.user.application.port.in;

public interface DeleteAccountUseCase {

    /** {@code caller} is the network a wrong password counts against. */
    void deleteAccount(Long userId, String password, String caller);
}
