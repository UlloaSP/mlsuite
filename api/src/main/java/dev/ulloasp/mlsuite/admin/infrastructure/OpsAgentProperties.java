package dev.ulloasp.mlsuite.admin.infrastructure;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class OpsAgentProperties {

    private final String baseUrl;
    private final String sharedSecret;

    public OpsAgentProperties(
            @Value("${mlsuite.ops-agent.base-url}") String baseUrl,
            @Value("${mlsuite.ops-agent.shared-secret}") String sharedSecret) {
        this.baseUrl = baseUrl;
        this.sharedSecret = sharedSecret;
    }

    public String baseUrl() {
        return baseUrl;
    }

    public String sharedSecret() {
        return sharedSecret;
    }
}
