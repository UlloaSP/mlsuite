package dev.ulloasp.mlsuite.security.auth;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.security.SecurityConfig;
import dev.ulloasp.mlsuite.security.identity.ClientNetworks;
import dev.ulloasp.mlsuite.user.adapter.in.web.UserController;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.user.application.port.in.GetCurrentUserProfileUseCase;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.PersonalAccountService;

/**
 * Sign-in and registration behind the real security chain, password encoder, account lookup and
 * session check. Only the stored accounts are stand-ins: {@link #account} keeps one that tests change
 * the way the admin pages would.
 */
@WebMvcTest(controllers = { AuthController.class, UserController.class }, properties = {
        "spring.profiles.active=test",
        "logging.file.name=target/auth-http-test.log",
        "server.port=0",
        "cors.allow-origins=http://localhost:5173",
        "mlsuite.auth.max-login-failures=3",
        "mlsuite.auth.max-registrations=2" })
@Import({ SecurityConfig.class, AuthService.class, AuthAttemptLimiter.class, DatabaseUserDetailsService.class,
        SessionAccountCheck.class })
@MockitoBean(types = { PersonalAccountService.class, AuditLogService.class,
        dev.ulloasp.mlsuite.user.application.port.in.DeleteAccountUseCase.class })
abstract class AuthHttpFixture {

    static final String PASSWORD = "correct-horse-battery";
    static final String ME = "/api/users/me";

    @Autowired
    MockMvc mockMvc;
    @Autowired
    PasswordEncoder passwordEncoder;
    @MockitoBean
    UserRepository userRepository;
    @MockitoBean
    GetCurrentUserProfileUseCase profiles;

    /** The only stored account; every test starts with it enabled and unchanged. */
    User account;
    /** The network of the test's requests: the limiter outlives each test in the cached context. */
    String network;

    @BeforeEach
    void storeAccount() {
        account = new User("alice", "alice-" + UUID.randomUUID() + "@example.com",
                passwordEncoder.encode(PASSWORD), "Alice", SystemRole.USER);
        account.setId(7L);
        network = "test-network-" + UUID.randomUUID();
        when(userRepository.findById(anyLong())).thenReturn(Optional.empty());
        when(userRepository.findById(7L)).thenAnswer(invocation -> Optional.ofNullable(account));
        when(userRepository.findByEmailIgnoreCase(account.getEmail()))
                .thenAnswer(invocation -> Optional.ofNullable(account));
        when(profiles.getProfile(7L)).thenAnswer(invocation -> account);
    }

    MockHttpServletRequestBuilder login(String password) {
        return post("/api/auth/login")
                .header(ClientNetworks.CLIENT_ADDRESS_HEADER, network)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(account.getEmail(), password));
    }
}
