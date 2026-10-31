package dev.ulloasp.mlsuite.security.auth;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.security.identity.ClientNetworks;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class PasswordChangeController {

    private final PasswordChangeService passwordChanges;
    private final ClientNetworks clientNetworks = new ClientNetworks();

    /** Keeps the session that asked signed in: the change has ended every other one. */
    @PostMapping("/api/users/me/password")
    public ResponseEntity<Void> change(
            CurrentUser user,
            @Valid @RequestBody ChangePasswordRequest request,
            HttpServletRequest servletRequest) {
        SessionSignIn.adopt(
                passwordChanges.change(user.userId(), request, clientNetworks.key(servletRequest)),
                servletRequest);
        return ResponseEntity.noContent().build();
    }
}
