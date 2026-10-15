package dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import dev.ulloasp.mlsuite.apiaccess.domain.model.ApiRequest;

/**
 * The calls clients made. A null organization or client widens a read to the whole platform or
 * to every client of the organization. Outcomes: {@code succeeded} below 400, {@code rejected}
 * 4xx (the caller's to fix), {@code failed} 5xx (the platform's), {@code errors} both.
 */
public interface ApiRequestRepository extends JpaRepository<ApiRequest, Long> {

    String SCOPE = """
            (CAST(:organizationId AS BIGINT) IS NULL OR organization_id = CAST(:organizationId AS BIGINT))
            AND (CAST(:clientId AS BIGINT) IS NULL OR api_client_id = CAST(:clientId AS BIGINT))
            AND created_at >= :since
            """;

    String CATALOG = """
            FROM ApiRequest r
            WHERE (:organizationId IS NULL OR r.organizationId = :organizationId)
              AND (:clientId IS NULL OR r.clientId = :clientId)
              AND (:outcome = 'all'
                   OR (:outcome = 'succeeded' AND r.status < 400)
                   OR (:outcome = 'rejected' AND r.status >= 400 AND r.status < 500)
                   OR (:outcome = 'failed' AND r.status >= 500)
                   OR (:outcome = 'errors' AND r.status >= 400))
              AND (:search = ''
                   OR LOWER(CAST(r.requestId AS String)) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(r.clientName) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(COALESCE(r.bookmarkName, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(COALESCE(r.errorCode, '')) LIKE LOWER(CONCAT('%', :search, '%')))
            """;

    /** Newest first. */
    @Query(value = "SELECT r " + CATALOG + " ORDER BY r.createdAt DESC, r.id DESC",
            countQuery = "SELECT COUNT(r) " + CATALOG)
    Page<ApiRequest> findCatalog(Long organizationId, Long clientId, String outcome, String search, Pageable pageable);

    long countByClientIdAndCreatedAtGreaterThanEqual(Long clientId, OffsetDateTime since);

    long countByOrganizationIdAndStatusAndCreatedAtGreaterThanEqual(Long organizationId, int status,
            OffsetDateTime since);

    @Query("""
            SELECT r.organizationId, COUNT(r) FROM ApiRequest r
            WHERE r.organizationId IN :organizationIds AND r.status = 200 AND r.createdAt >= :since
            GROUP BY r.organizationId
            """)
    List<Object[]> countSucceededByOrganization(Collection<Long> organizationIds, OffsetDateTime since);

    @Query("""
            SELECT r.clientId, COUNT(r), SUM(CASE WHEN r.status >= 400 THEN 1 ELSE 0 END) FROM ApiRequest r
            WHERE r.clientId IN :clientIds AND r.createdAt >= :since
            GROUP BY r.clientId
            """)
    List<Object[]> countByClient(Collection<Long> clientIds, OffsetDateTime since);

    @Query(value = """
            SELECT COUNT(*) AS calls,
                   COUNT(*) FILTER (WHERE status >= 400 AND status < 500) AS rejected,
                   COUNT(*) FILTER (WHERE status >= 500) AS failed,
                   COUNT(*) FILTER (WHERE error_code = 'runtime_busy') AS busy,
                   PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) FILTER (WHERE status = 200) AS p95,
                   COUNT(DISTINCT api_client_id) AS clients,
                   COUNT(DISTINCT organization_id) AS organizations
            FROM api_request WHERE """ + SCOPE, nativeQuery = true)
    ApiUsageTotals totals(Long organizationId, Long clientId, OffsetDateTime since);

    /** {@code unit} is {@code hour} or {@code day}, in UTC; each bucket starts at its epoch second. */
    @Query(value = """
            SELECT CAST(EXTRACT(EPOCH FROM DATE_TRUNC(:unit, created_at, 'UTC')) AS BIGINT) AS bucket,
                   COUNT(*) FILTER (WHERE status < 400) AS succeeded,
                   COUNT(*) FILTER (WHERE status >= 400 AND status < 500) AS rejected,
                   COUNT(*) FILTER (WHERE status >= 500) AS failed
            FROM api_request WHERE """ + SCOPE + """
            GROUP BY bucket ORDER BY bucket
            """, nativeQuery = true)
    List<ApiUsageBucket> series(String unit, Long organizationId, Long clientId, OffsetDateTime since);

    @Query(value = """
            SELECT api_client_id AS clientId, MAX(client_name) AS clientName, organization_id AS organizationId,
                   COUNT(*) AS calls, COUNT(*) FILTER (WHERE status >= 400) AS errors
            FROM api_request WHERE api_client_id IS NOT NULL AND """ + SCOPE + """
            GROUP BY api_client_id, organization_id ORDER BY calls DESC, clientName LIMIT 5
            """, nativeQuery = true)
    List<ApiUsageClient> topClients(Long organizationId, Long clientId, OffsetDateTime since);

    /**
     * Logs one call. The client, key, bookmark and run are named by id only while they still
     * exist when the call ends: a key revoked or a client deleted while its call ran leaves the
     * call logged under their names alone.
     */
    @Modifying
    @Query(value = """
            INSERT INTO api_request (request_id, organization_id, api_client_id, client_name, api_client_key_id,
                key_prefix, schema_bookmark_id, bookmark_name, prediction_run_id, status, error_code, duration_ms,
                created_at)
            VALUES (:requestId, :organizationId,
                (SELECT id FROM api_client WHERE id = :clientId), :clientName,
                (SELECT id FROM api_client_key WHERE id = :keyId), :keyPrefix,
                (SELECT id FROM schema_bookmark WHERE id = :bookmarkId), :bookmarkName,
                (SELECT id FROM prediction_run WHERE id = :runId), :status, :errorCode, :durationMs, :createdAt)
            """, nativeQuery = true)
    int log(UUID requestId, Long organizationId, Long clientId, String clientName, Long keyId, String keyPrefix,
            Long bookmarkId, String bookmarkName, Long runId, int status, String errorCode, int durationMs,
            OffsetDateTime createdAt);

    @Modifying
    @Query("DELETE FROM ApiRequest r WHERE r.createdAt < :before")
    int deleteCreatedBefore(OffsetDateTime before);
}
