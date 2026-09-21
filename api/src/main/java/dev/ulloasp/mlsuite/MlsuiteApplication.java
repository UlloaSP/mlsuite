package dev.ulloasp.mlsuite;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.http.client.BufferingClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class MlsuiteApplication {

    public static void main(String[] args) {
        String mode = System.getenv().getOrDefault("MLSUITE_MODE", "serve");
        if ("migrate".equalsIgnoreCase(mode)) {
            DatabaseMigrationApplication.run(args);
            return;
        }
        if ("artifact-migrate".equalsIgnoreCase(mode)) {
            ArtifactMigrationApplication.run(args);
            return;
        }
        SpringApplication.run(MlsuiteApplication.class, args);
    }

    @Bean
    RestTemplate restTemplate(RestTemplateBuilder builder) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5000);
        requestFactory.setReadTimeout(10000);

        RestTemplate rt = builder
                .requestFactory(() -> new BufferingClientHttpRequestFactory(requestFactory))
                .build();

        rt.getInterceptors().add((req, body, ex) -> {
            return ex.execute(req, body);
        });

        return rt;
    }
}
