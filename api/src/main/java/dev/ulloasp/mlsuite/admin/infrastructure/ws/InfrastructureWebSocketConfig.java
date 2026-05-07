package dev.ulloasp.mlsuite.admin.infrastructure.ws;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class InfrastructureWebSocketConfig implements WebSocketConfigurer {

    private final InfrastructureStreamWebSocketHandler streamHandler;
    private final InfrastructureTerminalWebSocketHandler terminalHandler;
    private final List<String> allowedOrigins;

    public InfrastructureWebSocketConfig(
            InfrastructureStreamWebSocketHandler streamHandler,
            InfrastructureTerminalWebSocketHandler terminalHandler,
            @Value("${cors.allow-origins}") List<String> allowedOrigins) {
        this.streamHandler = streamHandler;
        this.terminalHandler = terminalHandler;
        this.allowedOrigins = allowedOrigins;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        String[] origins = allowedOrigins.toArray(String[]::new);
        registry.addHandler(streamHandler, "/api/admin/infrastructure/stream")
                .setAllowedOrigins(origins);
        registry.addHandler(terminalHandler, "/api/admin/infrastructure/terminal/*")
                .setAllowedOrigins(origins);
    }
}
