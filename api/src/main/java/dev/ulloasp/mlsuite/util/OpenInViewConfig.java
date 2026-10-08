package dev.ulloasp.mlsuite.util;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.orm.jpa.support.OpenEntityManagerInViewInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Open-in-view keeps one persistence session for a whole web request, and that session keeps its
 * pooled connection until the request ends. A request that waits on the runtime must not hold a
 * connection while it waits, so it is left out here: it reads inside its own short transaction.
 * Declaring the interceptor replaces Spring Boot's registration, which covers every path.
 */
@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(prefix = "spring.jpa", name = "open-in-view", havingValue = "true", matchIfMissing = true)
public class OpenInViewConfig {

    private static final String PUBLIC_PREDICTIONS = "/api/public/bookmarks/*/predictions";

    @Bean
    OpenEntityManagerInViewInterceptor openEntityManagerInViewInterceptor() {
        return new OpenEntityManagerInViewInterceptor();
    }

    @Bean
    WebMvcConfigurer openEntityManagerInViewRegistration(OpenEntityManagerInViewInterceptor interceptor) {
        return new WebMvcConfigurer() {
            @Override
            public void addInterceptors(InterceptorRegistry registry) {
                registry.addWebRequestInterceptor(interceptor).excludePathPatterns(PUBLIC_PREDICTIONS);
            }
        };
    }
}
