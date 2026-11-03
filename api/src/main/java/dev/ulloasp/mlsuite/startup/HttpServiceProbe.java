package dev.ulloasp.mlsuite.startup;

import java.io.IOException;
import java.net.http.HttpClient;
import java.time.Duration;

import org.springframework.http.HttpStatusCode;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

/** Asks a service's health endpoint, which must answer with a success within {@link #TIMEOUT}. */
@Component
public class HttpServiceProbe implements ServiceProbe {

    static final Duration TIMEOUT = Duration.ofSeconds(2);

    private final RestClient client;

    public HttpServiceProbe(RestClient.Builder builder) {
        // HTTP/1.1: the services speak nothing else, and the client would otherwise ask to upgrade.
        HttpClient http = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(TIMEOUT)
                .build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(http);
        factory.setReadTimeout(TIMEOUT);
        this.client = builder.requestFactory(factory).build();
    }

    @Override
    public void requireOk(String url) throws IOException {
        HttpStatusCode status;
        try {
            status = client.get().uri(url).exchange((request, response) -> response.getStatusCode());
        } catch (ResourceAccessException ex) {
            if (ex.getCause() instanceof IOException cause) {
                throw cause;
            }
            throw ex;
        }
        if (!status.is2xxSuccessful()) {
            throw new IOException("HTTP " + status.value());
        }
    }
}
