package dev.ulloasp.mlsuite.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.RETURNS_DEEP_STUBS;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.DefaultSecurityFilterChain;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfigurationSource;

import dev.ulloasp.mlsuite.security.oauth2.OAuth2AuthenticationSuccessHandler;

@ExtendWith(MockitoExtension.class)
class SecurityConfigTest {

    @Mock
    private OAuth2AuthenticationSuccessHandler oauth2AuthenticationSuccessHandler;

    @Mock
    private AuthenticationConfiguration authenticationConfiguration;

    @Mock
    private AuthenticationManager authenticationManager;

    private SecurityConfig securityConfig;

    @BeforeEach
    void setUp() {
        securityConfig = new SecurityConfig();
    }

    @Test
    void securityFilterChain_ShouldConfigureCorrectly() throws Exception {
        // Given
        HttpSecurity httpSecurity = mock(HttpSecurity.class, RETURNS_DEEP_STUBS);
        DefaultSecurityFilterChain filterChain = mock(DefaultSecurityFilterChain.class);

        // Mock the chain methods to return self for fluent API
        when(httpSecurity.cors(any())).thenReturn(httpSecurity);
        when(httpSecurity.csrf(any())).thenReturn(httpSecurity);
        when(httpSecurity.sessionManagement(any())).thenReturn(httpSecurity);
        when(httpSecurity.authorizeHttpRequests(any())).thenReturn(httpSecurity);
        when(httpSecurity.exceptionHandling(any())).thenReturn(httpSecurity);
        when(httpSecurity.oauth2Login(any())).thenReturn(httpSecurity);
        when(httpSecurity.logout(any())).thenReturn(httpSecurity);
        when(httpSecurity.build()).thenReturn(filterChain);

        // When
        SecurityFilterChain result = securityConfig.securityFilterChain(httpSecurity,
                oauth2AuthenticationSuccessHandler);

        // Then
        assertNotNull(result);
        verify(httpSecurity).cors(any());
        verify(httpSecurity).csrf(any());
        verify(httpSecurity).sessionManagement(any());
        verify(httpSecurity).authorizeHttpRequests(any());
        verify(httpSecurity).exceptionHandling(any());
        verify(httpSecurity).oauth2Login(any());
        verify(httpSecurity).logout(any());
        verify(httpSecurity).build();
    }

    @Test
    void authenticationManager_ShouldReturnManager() throws Exception {
        // Given
        when(authenticationConfiguration.getAuthenticationManager()).thenReturn(authenticationManager);

        // When
        AuthenticationManager result = securityConfig.authenticationManager(authenticationConfiguration);

        // Then
        assertNotNull(result);
        assertEquals(authenticationManager, result);
        verify(authenticationConfiguration).getAuthenticationManager();
    }

    @Test
    void corsConfigurationSource_ShouldConfigureCorrectly() {
        // When
        CorsConfigurationSource result = securityConfig.corsConfigurationSource();

        // Then
        assertNotNull(result);
    }

    @Test
    void constructor_ShouldCreateInstance() {
        // When
        SecurityConfig config = new SecurityConfig();

        // Then
        assertNotNull(config);
    }
}
