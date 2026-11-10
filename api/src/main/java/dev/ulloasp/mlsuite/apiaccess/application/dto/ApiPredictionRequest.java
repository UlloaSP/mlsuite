package dev.ulloasp.mlsuite.apiaccess.application.dto;

import java.util.LinkedHashMap;
import java.util.Map;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import dev.ulloasp.mlsuite.apiaccess.domain.exception.ApiErrorCode;
import dev.ulloasp.mlsuite.apiaccess.domain.exception.ApiProblem;

/**
 * A client's call: one record for the bookmark's model, under the model's own feature names; each
 * value a scalar. The body is read only once the key is known, so a caller without a valid key
 * learns nothing about what a body should hold.
 */
public record ApiPredictionRequest(Map<String, Object> features) {

    private static final JsonMapper JSON = JsonMapper.shared();

    /** The call's body read as a request, or the problem that says why it is not one. */
    public static ApiPredictionRequest read(String body) {
        JsonNode node;
        try {
            node = body == null || body.isBlank() ? null : JSON.readTree(body);
        } catch (JacksonException unreadable) {
            throw new ApiProblem(ApiErrorCode.INVALID_BODY, "The body is not valid JSON.");
        }
        if (node == null || !node.isObject() || !node.path("features").isObject()) {
            throw new ApiProblem(ApiErrorCode.INVALID_BODY, "The body must be an object with a \"features\" object.");
        }
        Map<String, Object> features = new LinkedHashMap<>();
        node.get("features").properties().forEach(entry -> features.put(entry.getKey(), JSON.convertValue(entry.getValue(), Object.class)));
        return new ApiPredictionRequest(features);
    }
}
