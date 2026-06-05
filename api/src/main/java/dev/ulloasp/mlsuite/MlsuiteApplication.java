package dev.ulloasp.mlsuite;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.http.client.BufferingClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@SpringBootApplication
public class MlsuiteApplication {

    public static void main(String[] args) {
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

