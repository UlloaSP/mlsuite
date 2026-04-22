package dev.ulloasp.mlsuite.signature;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;

import dev.ulloasp.mlsuite.model.entities.Model;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import dev.ulloasp.mlsuite.signature.controllers.SignatureControllerImpl;
import dev.ulloasp.mlsuite.signature.dtos.CreateSignatureParams;
import dev.ulloasp.mlsuite.signature.entities.Signature;
import dev.ulloasp.mlsuite.signature.exceptions.InvalidSignatureSchemaException;
import dev.ulloasp.mlsuite.signature.exceptions.SignatureDoesNotExistsException;
import dev.ulloasp.mlsuite.signature.services.SignatureService;
import dev.ulloasp.mlsuite.util.ErrorDto;
import jakarta.servlet.http.HttpServletRequest;

@ExtendWith(MockitoExtension.class)
class SignatureControllerTest {

    @Mock
    private CurrentUserResolver currentUserResolver;

    @Mock
    private SignatureService signatureService;

    @Mock
    private OAuth2AuthenticationToken authentication;

    @Mock
    private HttpServletRequest request;

    private SignatureControllerImpl controller;

    @BeforeEach
    void setUp() {
        controller = new SignatureControllerImpl(currentUserResolver, signatureService);
        when(currentUserResolver.resolve(authentication)).thenReturn(new CurrentUser(6L, "alice"));
    }

    @Test
    void createSignature_UsesInternalUserId() {
        CreateSignatureParams params = new CreateSignatureParams();
        params.setModelId(11L);
        params.setName("sig");
        params.setMajor(1);
        params.setMinor(0);
        params.setPatch(0);
        params.setInputSignature(Map.of("x", "int"));
        when(signatureService.createSignature(6L, 11L, Map.of("x", "int"), "sig", 1, 0, 0, null))
                .thenReturn(signature());

        ResponseEntity<?> response = controller.createSignature(authentication, params);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        verify(signatureService).createSignature(6L, 11L, Map.of("x", "int"), "sig", 1, 0, 0, null);
    }

    @Test
    void getAllSignatures_ReturnsDtos() {
        when(signatureService.getSignatureByModelId(6L, 11L)).thenReturn(List.of(signature()));

        assertEquals(1, controller.getAllSignatures(authentication, 11L).getBody().size());
    }

    @Test
    void getSignatureById_PropagatesMissingSignature() {
        when(signatureService.getSignature(6L, 99L)).thenThrow(new SignatureDoesNotExistsException(99L));

        assertThrows(SignatureDoesNotExistsException.class, () -> controller.getSignatureById(authentication, 99L));
    }

    @Test
    void handleInvalidSignatureSchemaException_ReturnsBadRequest() {
        when(request.getRequestURI()).thenReturn("/api/signatures");

        ResponseEntity<ErrorDto> response = controller.handleInvalidSignatureSchemaException(
                new InvalidSignatureSchemaException(
                        "Custom explanation kind \"old-kind\" does not exist in active plugin catalog."),
                request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    private Signature signature() {
        Model model = new Model();
        model.setId(11L);
        Signature signature = new Signature();
        signature.setId(12L);
        signature.setModel(model);
        signature.setName("sig");
        signature.setMajor(1);
        signature.setMinor(0);
        signature.setPatch(0);
        signature.setInputSignature(Map.of("x", "int"));
        return signature;
    }
}
