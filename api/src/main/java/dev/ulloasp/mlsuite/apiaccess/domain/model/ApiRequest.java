package dev.ulloasp.mlsuite.apiaccess.domain.model;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * One call made with a valid key, whatever its outcome, written once when the call ends by
 * {@code ApiRequestRepository.log}. The client, key, bookmark and run are kept by id and, where
 * a reader needs them after deletion, by name: the database clears an id when its row goes, and
 * the call still counts towards its organization's month. {@code requestId} is the id the
 * caller was given.
 */
@Entity
@Table(name = "api_request")
@Getter
@NoArgsConstructor
public class ApiRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_id", nullable = false, updatable = false)
    private UUID requestId;

    @Column(name = "organization_id", nullable = false, updatable = false)
    private Long organizationId;

    @Column(name = "api_client_id", updatable = false)
    private Long clientId;

    @Column(name = "client_name", nullable = false, updatable = false, length = ApiClient.NAME_MAX_LENGTH)
    private String clientName;

    @Column(name = "api_client_key_id", updatable = false)
    private Long keyId;

    @Column(name = "key_prefix", nullable = false, updatable = false, length = 16)
    private String keyPrefix;

    @Column(name = "schema_bookmark_id", updatable = false)
    private Long bookmarkId;

    @Column(name = "bookmark_name", updatable = false, length = 180)
    private String bookmarkName;

    @Column(name = "prediction_run_id", updatable = false)
    private Long predictionRunId;

    @Column(name = "status", nullable = false, updatable = false)
    private int status;

    @Column(name = "error_code", updatable = false, length = 40)
    private String errorCode;

    @Column(name = "duration_ms", nullable = false, updatable = false)
    private int durationMs;

    @Column(name = "created_at", nullable = false, updatable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;
}
