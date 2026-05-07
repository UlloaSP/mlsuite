package dev.ulloasp.mlsuite.admin.infrastructure.ws;

import java.security.Principal;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;

@Component
public class SuperadminWebSocketGuard {

    public boolean allow(WebSocketSession session) {
        Principal principal = session.getPrincipal();
        if (principal instanceof Authentication authentication) {
            return authentication.getAuthorities().stream()
                    .anyMatch(authority -> "ROLE_SUPERADMIN".equals(authority.getAuthority()));
        }
        return false;
    }

    public void reject(WebSocketSession session) throws Exception {
        session.close(new CloseStatus(4403, "Superadmin required"));
    }
}
