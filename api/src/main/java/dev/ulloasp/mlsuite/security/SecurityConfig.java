/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import dev.ulloasp.mlsuite.security.local.LocalUserDetailsService;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

        @Bean
        protected SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

                http
                                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                                .csrf(csrf -> csrf.disable())
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                                .authorizeHttpRequests(authorize -> authorize
                                                .requestMatchers("/actuator/**").permitAll()
                                                .requestMatchers("/", "/assets/**").permitAll()
                                                .requestMatchers("/api/auth/register", "/api/auth/login", "/api/auth/logout").permitAll()
                                                .anyRequest().authenticated())
                                .exceptionHandling(e -> e.authenticationEntryPoint(
                                                new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                                .logout(logout -> logout
                                                .logoutUrl("/api/auth/logout")
                                                .logoutSuccessHandler(
                                                                new HttpStatusReturningLogoutSuccessHandler(
                                                                                HttpStatus.NO_CONTENT))
                                                .deleteCookies("JSESSIONID"));
                return http.build();
        }

        @Bean
        public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration)
                        throws Exception {
                return authenticationConfiguration.getAuthenticationManager();
        }

        @Bean
        public DaoAuthenticationProvider authenticationProvider(
                        LocalUserDetailsService localUserDetailsService,
                        PasswordEncoder passwordEncoder) {
                DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
                provider.setUserDetailsService(localUserDetailsService);
                provider.setPasswordEncoder(passwordEncoder);
                return provider;
        }

        @Bean
        public PasswordEncoder passwordEncoder() {
                return new BCryptPasswordEncoder(12);
        }

        @Bean
        public CorsConfigurationSource corsConfigurationSource() {

                CorsConfiguration config = new CorsConfiguration();
                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();

                config.setAllowCredentials(true);
                config.addAllowedOrigin("https://localhost:5173");
                config.addAllowedOrigin("https://localhost:8443");
                config.addAllowedHeader("*");
                config.addAllowedMethod("OPTIONS");
                config.addAllowedMethod("GET");
                config.addAllowedMethod("POST");
                config.addAllowedMethod("PUT");
                config.addAllowedMethod("DELETE");
                config.addAllowedMethod("PATCH");

                source.registerCorsConfiguration("/**", config);

                return source;

        }
}
