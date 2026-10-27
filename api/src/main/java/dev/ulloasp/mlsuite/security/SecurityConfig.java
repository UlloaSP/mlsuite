/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.security;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import dev.ulloasp.mlsuite.security.auth.SessionAccountCheck;
import dev.ulloasp.mlsuite.security.auth.StaleSessionFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

        private final List<String> allowedOrigins;

        public SecurityConfig(@Value("${cors.allow-origins}") List<String> allowedOrigins) {
                this.allowedOrigins = allowedOrigins;
        }

        @Bean
        protected SecurityFilterChain securityFilterChain(HttpSecurity http, SessionAccountCheck sessionAccountCheck)
                        throws Exception {

                http
                                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                                .csrf(csrf -> csrf.disable())
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                                .addFilterAfter(new StaleSessionFilter(sessionAccountCheck),
                                                SecurityContextHolderFilter.class)
                                .authorizeHttpRequests(authorize -> authorize
                                                .requestMatchers("/actuator/**").permitAll()
                                                .requestMatchers("/api/readiness").permitAll()
                                                .requestMatchers("/api/auth/register", "/api/auth/login").permitAll()
                                                .requestMatchers("/api/public/**").permitAll()
                                                .requestMatchers("/api/v1/**").permitAll()
                                                .requestMatchers("/", "/assets/**").permitAll()
                                                .anyRequest().authenticated())
                                .exceptionHandling(e -> e.authenticationEntryPoint(
                                                new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                                .logout(logout -> logout
                                                .logoutUrl("/api/logout")
                                                .logoutSuccessHandler(
                                                                new HttpStatusReturningLogoutSuccessHandler(
                                                                                HttpStatus.NO_CONTENT))
                                                .deleteCookies("JSESSIONID"));
                return http.build();
        }

        @Bean
        public PasswordEncoder passwordEncoder() {
                return new BCryptPasswordEncoder();
        }

        @Bean
        public DaoAuthenticationProvider authenticationProvider(
                        UserDetailsService userDetailsService,
                        PasswordEncoder passwordEncoder) {
                DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
                provider.setPasswordEncoder(passwordEncoder);
                return provider;
        }

        @Bean
        public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration)
                        throws Exception {
                return authenticationConfiguration.getAuthenticationManager();
        }

        @Bean
        public CorsConfigurationSource corsConfigurationSource() {

                CorsConfiguration config = new CorsConfiguration();
                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();

                config.setAllowCredentials(true);
                config.setAllowedOrigins(allowedOrigins);
                config.addAllowedHeader("*");
                config.addAllowedMethod("OPTIONS");
                config.addAllowedMethod("GET");
                config.addAllowedMethod("POST");
                config.addAllowedMethod("PUT");
                config.addAllowedMethod("DELETE");
                config.addAllowedMethod("PATCH");

                // API clients call with a key, never with cookies, from any origin. The source
                // answers with the first pattern that matches, so this one goes before /**.
                CorsConfiguration clients = new CorsConfiguration();
                clients.setAllowCredentials(false);
                clients.addAllowedOrigin("*");
                clients.addAllowedMethod("POST");
                clients.addAllowedMethod("OPTIONS");
                clients.addAllowedHeader("Content-Type");
                clients.addAllowedHeader("X-MLSuite-Key");
                clients.addExposedHeader("X-Request-Id");
                clients.addExposedHeader("Retry-After");
                source.registerCorsConfiguration("/api/v1/**", clients);
                source.registerCorsConfiguration("/**", config);

                return source;

        }
}

