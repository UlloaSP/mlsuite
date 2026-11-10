package dev.ulloasp.mlsuite.principal.application.service;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.apiaccess.domain.model.ApiClient;
import dev.ulloasp.mlsuite.principal.adapter.out.persistence.repository.PrincipalRepository;
import dev.ulloasp.mlsuite.principal.domain.model.Principal;
import dev.ulloasp.mlsuite.principal.domain.model.PrincipalKind;
import dev.ulloasp.mlsuite.user.domain.model.User;
import lombok.RequiredArgsConstructor;

/** Finds the principal behind whoever acts; a person's and a client's exists from the moment they do. */
@Component
@RequiredArgsConstructor
public class Principals {

    private final PrincipalRepository principals;

    public Principal of(User user) {
        return user(user.getId());
    }

    public Principal user(Long userId) {
        return principals.findByUserId(userId)
                .orElseThrow(() -> new IllegalStateException("User " + userId + " has no principal"));
    }

    public Principal of(ApiClient client) {
        return client(client.getId());
    }

    public Principal client(Long apiClientId) {
        return principals.findByApiClientId(apiClientId)
                .orElseThrow(() -> new IllegalStateException("API client " + apiClientId + " has no principal"));
    }

    /** The platform, for what no person or client asked for. */
    public Principal system() {
        return principals.findByKind(PrincipalKind.SYSTEM)
                .orElseThrow(() -> new IllegalStateException("The platform has no principal"));
    }

    /** The visitor whose cookie carries {@code token}, met now if it is new. */
    public Principal visitor(UUID token, OffsetDateTime now) {
        return principals.findByVisitorToken(token).orElseGet(() -> principals.save(Principal.visitor(token, now)));
    }
}
