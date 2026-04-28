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

import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import dev.ulloasp.mlsuite.signature.adapter.in.web.SignatureControllerImpl;
import dev.ulloasp.mlsuite.signature.application.dto.CreateSignatureParams;
import dev.ulloasp.mlsuite.signature.application.port.in.SignatureCatalogUseCase;
import dev.ulloasp.mlsuite.signature.domain.model.Signature;
import dev.ulloasp.mlsuite.signature.domain.exception.SignatureDoesNotExistsException;

@ExtendWith(MockitoExtension.class)
class SignatureControllerTest {

    @Mock
    private CurrentUserResolver currentUserResolver;

    @Mock
    private SignatureCatalogUseCase signatureCatalogUseCase;

    @Mock
    private OAuth2AuthenticationToken authentication;

    private SignatureControllerImpl controller;

    @BeforeEach
    void setUp() {
        controller = new SignatureControllerImpl(currentUserResolver, signatureCatalogUseCase);
        when(currentUserResolver.resolve(authentication)).thenReturn(new CurrentUser(6L, "alice"));
    }

    @Test
    void createSignature_UsesInternalUserId() {
        CreateSignatureParams params = new CreateSignatureParams(11L, "sig", Map.of("x", "int"), 1, 0, 0, null);
        when(signatureCatalogUseCase.createSignature(6L, 11L, Map.of("x", "int"), "sig", 1, 0, 0, null))
                .thenReturn(signature());

        ResponseEntity<?> response = controller.createSignature(authentication, params);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        verify(signatureCatalogUseCase).createSignature(6L, 11L, Map.of("x", "int"), "sig", 1, 0, 0, null);
    }

    @Test
    void getAllSignatures_ReturnsDtos() {
        when(signatureCatalogUseCase.getSignatureByModelId(6L, 11L)).thenReturn(List.of(signature()));

        assertEquals(1, controller.getAllSignatures(authentication, 11L).getBody().size());
    }

    @Test
    void getSignatureById_PropagatesMissingSignature() {
        when(signatureCatalogUseCase.getSignature(6L, 99L)).thenThrow(new SignatureDoesNotExistsException(99L));

        assertThrows(SignatureDoesNotExistsException.class, () -> controller.getSignatureById(authentication, 99L));
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

