package dev.ulloasp.mlsuite.model.exceptions;

import java.nio.charset.StandardCharsets;
import java.util.Objects;

import org.springframework.http.HttpHeaders;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Wraps any error coming from the external Analyzer (FastAPI) service.
 * Preserves HTTP status, endpoint, and parsed "detail" message.
 */
public class AnalyzerServiceException extends RuntimeException {

    private final int status; // 0 for network/unavailable
    private final String endpoint;
    private final String detail; // best-effort parsed message (FastAPI "detail")
    private final String rawBody; // raw response body for troubleshooting
    private final HttpHeaders headers; // may be empty for network errors

    public AnalyzerServiceException(int status, String endpoint, String detail, String rawBody, HttpHeaders headers) {
        super(detail != null && !detail.isBlank() ? detail : "Analyzer service error");
        this.status = status;
        this.endpoint = endpoint;
        this.detail = detail;
        this.rawBody = rawBody;
        this.headers = headers != null ? HttpHeaders.readOnlyHttpHeaders(headers) : HttpHeaders.EMPTY;
    }

    public int getStatus() {
        return status;
    }

    public String getEndpoint() {
        return endpoint;
    }

    public String getDetail() {
        return detail;
    }

    public String getRawBody() {
        return rawBody;
    }

    public HttpHeaders getHeaders() {
        return headers;
    }

    /** Build from HTTP 4xx/5xx returned by the analyzer. */
    public static AnalyzerServiceException fromRestClient(RestClientResponseException ex, String endpoint) {
        String body = safeBody(ex);
        String parsed = parseFastApiDetail(body);
        return new AnalyzerServiceException(ex.getStatusCode().value(), endpoint, parsed, body,
                ex.getResponseHeaders());
    }

    /** Build from network/connectivity timeouts, DNS, connection refused, etc. */
    public static AnalyzerServiceException fromNetwork(ResourceAccessException ex, String endpoint) {
        String msg = "Analyzer service unreachable";
        return new AnalyzerServiceException(0, endpoint, msg,
                ex.getMessage() != null ? ex.getMessage() : "", HttpHeaders.EMPTY);
    }

    // ---------- helpers ----------

    private static String safeBody(RestClientResponseException ex) {
        try {
            byte[] bytes = ex.getResponseBodyAsByteArray();
            return bytes != null ? new String(bytes, StandardCharsets.UTF_8) : "";
        } catch (Exception ignore) {
            return "";
        }
    }

    /**
     * FastAPI typically returns:
     * - {"detail": "Not a sklearn estimator."}
     * - {"detail": [{"loc":[...], "msg":"...", "type":"..."}]}
     */
    private static String parseFastApiDetail(String body) {
        if (body == null || body.isBlank())
            return "";
        try {
            ObjectMapper om = new ObjectMapper();
            JsonNode root = om.readTree(body);
            JsonNode detail = root.get("detail");
            if (detail == null || detail.isNull())
                return "";
            if (detail.isTextual())
                return detail.asText();
            if (detail.isArray() && detail.size() > 0) {
                // Join messages from validation error array
                StringBuilder sb = new StringBuilder();
                for (JsonNode n : detail) {
                    String msg = n.hasNonNull("msg") ? n.get("msg").asText() : n.toString();
                    if (!msg.isBlank()) {
                        if (sb.length() > 0)
                            sb.append("; ");
                        sb.append(msg);
                    }
                }
                return sb.toString();
            }
            return detail.toString();
        } catch (Exception ignore) {
            return "";
        }
    }

    @Override
    public String toString() {
        return "AnalyzerServiceException{" +
                "status=" + status +
                ", endpoint='" + endpoint + '\'' +
                ", detail='" + detail + '\'' +
                '}';
    }

    @Override
    public boolean equals(Object o) {
        if (this == o)
            return true;
        if (!(o instanceof AnalyzerServiceException that))
            return false;
        return status == that.status &&
                Objects.equals(endpoint, that.endpoint) &&
                Objects.equals(detail, that.detail);
    }

    @Override
    public int hashCode() {
        return Objects.hash(status, endpoint, detail);
    }
}
