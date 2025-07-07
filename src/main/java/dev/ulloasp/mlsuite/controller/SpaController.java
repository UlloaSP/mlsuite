package dev.ulloasp.mlsuite.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

import jakarta.servlet.http.HttpServletRequest;

@Controller
public class SpaController {

    /**
     * Maneja todas las rutas que no son API para servir el SPA React Permite
     * que React Router maneje el routing del frontend
     */
    @GetMapping(value = "/**")
    public String forward(HttpServletRequest request) {
        String path = request.getRequestURI();

        // No interceptar rutas de API, OAuth2, actuator y recursos estáticos
        if (path.startsWith("/api/")
                || path.startsWith("/oauth2/")
                || path.startsWith("/login/")
                || path.startsWith("/actuator/")
                || path.startsWith("/static/")
                || path.startsWith("/assets/")
                || path.contains(".")) {
            return null; // Dejar que Spring maneje estas rutas normalmente
        }

        // Para cualquier otra ruta, servir el index.html del SPA
        return "forward:/index.html";
    }
}
