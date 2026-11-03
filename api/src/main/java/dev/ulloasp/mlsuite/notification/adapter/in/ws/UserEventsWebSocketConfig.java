package dev.ulloasp.mlsuite.notification.adapter.in.ws;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
public class UserEventsWebSocketConfig implements WebSocketConfigurer {

    private final UserEventsWebSocketHandler handler;
    private final List<String> allowedOrigins;

    public UserEventsWebSocketConfig(UserEventsWebSocketHandler handler,
            @Value("${cors.allow-origins}") List<String> allowedOrigins) {
        this.handler = handler;
        this.allowedOrigins = allowedOrigins;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(handler, "/api/me/events").setAllowedOrigins(allowedOrigins.toArray(String[]::new));
    }
}
