package dev.ulloasp.mlsuite.apiaccess.application.service;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository.ApiRequestRepository;
import dev.ulloasp.mlsuite.apiaccess.domain.model.ApiCaller;
import lombok.RequiredArgsConstructor;

/** Writes each call made with a valid key once it ends, in a transaction of its own. */
@Service
@Transactional
@RequiredArgsConstructor
public class ApiRequestLog {

    private final ApiRequestRepository repository;

    /** {@code target} is null when the call was refused before its bookmark was found. */
    public void record(UUID requestId, ApiCaller caller, ApiTarget target, Long runId, int status, String errorCode,
            int durationMs) {
        repository.log(requestId, caller.organizationId(), caller.clientId(), caller.clientName(), caller.keyId(),
                caller.keyPrefix(), target == null ? null : target.bookmarkId(), target == null ? null : target.name(),
                runId, status, errorCode, durationMs, OffsetDateTime.now());
    }
}
