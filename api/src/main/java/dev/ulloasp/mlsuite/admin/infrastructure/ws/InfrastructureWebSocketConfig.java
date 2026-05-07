package dev.ulloasp.mlsuite.admin.infrastructure.ws;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class InfrastructureWebSocketConfig implements WebSocketConfigurer {

    private final InfrastructureStreamWebSocketHandler streamHandler;
    private final InfrastructureTerminalWebSocketHandler terminalHandler;

    public InfrastructureWebSocketConfig(
            InfrastructureStreamWebSocketHandler streamHandler,
            InfrastructureTerminalWebSocketHandler terminalHandler) {
        this.streamHandler = streamHandler;
        this.terminalHandler = terminalHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(streamHandler, "/api/admin/infrastructure/stream");
        registry.addHandler(terminalHandler, "/api/admin/infrastructure/terminal/*");
    }
}
