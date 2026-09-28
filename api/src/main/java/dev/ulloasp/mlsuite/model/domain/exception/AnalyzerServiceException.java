/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.domain.exception;

import java.nio.charset.StandardCharsets;
import org.springframework.web.client.RestClientResponseException;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Wraps any error coming from the external Analyzer (FastAPI) service,
 * preserving its HTTP status (0 when unreachable) and parsed "detail" message.
 */
public class AnalyzerServiceException extends RuntimeException {

    private final int status;
    private final String detail;

    public AnalyzerServiceException(int status, String detail) {
        super(detail != null && !detail.isBlank() ? detail : "Analyzer service error");
        this.status = status;
        this.detail = detail;
    }

    public int getStatus() {
        return status;
    }

    public String getDetail() {
        return detail;
    }

    /** Build from HTTP 4xx/5xx returned by the analyzer. */
    public static AnalyzerServiceException fromRestClient(RestClientResponseException ex) {
        return new AnalyzerServiceException(ex.getStatusCode().value(), parseFastApiDetail(safeBody(ex)));
    }

    /** Build from network/connectivity timeouts, DNS, connection refused, etc. */
    public static AnalyzerServiceException fromNetwork() {
        return new AnalyzerServiceException(0, "Analyzer service unreachable");
    }

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
     * - {"detail": "Model must be a supported classifier or regressor."}
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
}
