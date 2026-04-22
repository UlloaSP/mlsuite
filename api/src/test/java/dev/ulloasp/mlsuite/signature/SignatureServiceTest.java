package dev.ulloasp.mlsuite.signature;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import dev.ulloasp.mlsuite.model.entities.Model;
import dev.ulloasp.mlsuite.model.exceptions.ModelDoesNotExistsException;
import dev.ulloasp.mlsuite.model.repositories.ModelRepository;
import dev.ulloasp.mlsuite.signature.entities.Signature;
import dev.ulloasp.mlsuite.signature.exceptions.InvalidSignatureSchemaException;
import dev.ulloasp.mlsuite.signature.exceptions.SignatureDoesNotExistsException;
import dev.ulloasp.mlsuite.signature.repositories.SignatureRepository;
import dev.ulloasp.mlsuite.signature.services.SignatureSchemaCompatibilityService;
import dev.ulloasp.mlsuite.signature.services.SignatureServiceImpl;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.service.UserLookupService;

@ExtendWith(MockitoExtension.class)
class SignatureServiceTest {

    @Mock
    private UserLookupService userLookupService;

    @Mock
    private SignatureRepository signatureRepository;

    @Mock
    private ModelRepository modelRepository;

    @Mock
    private SignatureSchemaCompatibilityService signatureSchemaCompatibilityService;

    private SignatureServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new SignatureServiceImpl(userLookupService, signatureRepository, modelRepository,
                signatureSchemaCompatibilityService);
    }

    @Test
    void createSignature_UsesInternalUserId() {
        when(userLookupService.requireById(5L)).thenReturn(user());
        when(modelRepository.findByIdAndUserId(11L, 5L)).thenReturn(Optional.of(model()));
        when(signatureRepository.save(any(Signature.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Signature result = service.createSignature(5L, 11L, Map.of("x", "int"), "sig", 1, 0, 0, null);

        assertEquals("sig", result.getName());
    }

    @Test
    void createSignature_ThrowsWhenSchemaCompatibilityFails() {
        when(userLookupService.requireById(5L)).thenReturn(user());
        when(modelRepository.findByIdAndUserId(11L, 5L)).thenReturn(Optional.of(model()));
        doThrow(new InvalidSignatureSchemaException(
                "Custom explanation kind \"old-kind\" does not exist in active plugin catalog."))
                .when(signatureSchemaCompatibilityService).validate(5L, Map.of("fields", List.of()));

        assertThrows(InvalidSignatureSchemaException.class,
                () -> service.createSignature(5L, 11L, Map.of("fields", List.of()), "sig", 1, 0, 0, null));
    }

    @Test
    void createSignature_ThrowsWhenModelMissing() {
        when(userLookupService.requireById(5L)).thenReturn(user());
        when(modelRepository.findByIdAndUserId(11L, 5L)).thenReturn(Optional.empty());

        assertThrows(ModelDoesNotExistsException.class,
                () -> service.createSignature(5L, 11L, Map.of("x", "int"), "sig", 1, 0, 0, null));
    }

    @Test
    void getSignature_ThrowsWhenOwnerScopedSignatureMissing() {
        when(userLookupService.requireById(5L)).thenReturn(user());
        when(signatureRepository.findByIdAndUserId(99L, 5L)).thenReturn(Optional.empty());

        assertThrows(SignatureDoesNotExistsException.class, () -> service.getSignature(5L, 99L));
    }

    @Test
    void getSignatureByModelId_ThrowsWhenOwnerScopedModelMissing() {
        when(userLookupService.requireById(5L)).thenReturn(user());
        when(modelRepository.findByIdAndUserId(11L, 5L)).thenReturn(Optional.empty());

        assertThrows(ModelDoesNotExistsException.class, () -> service.getSignatureByModelId(5L, 11L));
    }

    @Test
    void getSignatureByModelId_ReturnsList() {
        when(userLookupService.requireById(5L)).thenReturn(user());
        when(modelRepository.findByIdAndUserId(11L, 5L)).thenReturn(Optional.of(model()));
        when(signatureRepository.findByModelId(11L)).thenReturn(List.of(new Signature()));

        assertEquals(1, service.getSignatureByModelId(5L, 11L).size());
    }

    private User user() {
        User user = new User();
        user.setId(5L);
        user.setUsername("alice");
        return user;
    }

    private Model model() {
        Model model = new Model();
        model.setId(11L);
        model.setUser(user());
        model.setName("demo");
        return model;
    }
}
