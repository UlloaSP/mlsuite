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

import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.model.domain.exception.ModelDoesNotExistsException;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.signature.domain.model.Signature;
import dev.ulloasp.mlsuite.signature.domain.exception.InvalidSignatureSchemaException;
import dev.ulloasp.mlsuite.signature.domain.exception.SignatureDoesNotExistsException;
import dev.ulloasp.mlsuite.signature.adapter.out.persistence.repository.SignatureRepository;
import dev.ulloasp.mlsuite.signature.application.service.SignatureSchemaCompatibilityService;
import dev.ulloasp.mlsuite.signature.application.service.SignatureServiceImpl;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;

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

    @Mock
    private WorkspaceAccessService workspaceAccessService;

    private SignatureServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new SignatureServiceImpl(userLookupService, signatureRepository, modelRepository,
                signatureSchemaCompatibilityService, workspaceAccessService);
        when(workspaceAccessService.requireCurrentOrganization(5L)).thenReturn(organization());
    }

    @Test
    void createSignature_UsesInternalUserId() {
        when(userLookupService.requireById(5L)).thenReturn(user());
        when(modelRepository.findByIdAndOrganizationId(11L, 41L)).thenReturn(Optional.of(model()));
        when(signatureRepository.save(any(Signature.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Signature result = service.createSignature(5L, 11L, Map.of("x", "int"), "sig", 1, 0, 0, null);

        assertEquals("sig", result.getName());
    }

    @Test
    void createSignature_ThrowsWhenSchemaCompatibilityFails() {
        when(userLookupService.requireById(5L)).thenReturn(user());
        when(modelRepository.findByIdAndOrganizationId(11L, 41L)).thenReturn(Optional.of(model()));
        doThrow(new InvalidSignatureSchemaException(
                "Custom explanation kind \"old-kind\" does not exist in active plugin catalog."))
                .when(signatureSchemaCompatibilityService).validate(5L, Map.of("fields", List.of()));

        assertThrows(InvalidSignatureSchemaException.class,
                () -> service.createSignature(5L, 11L, Map.of("fields", List.of()), "sig", 1, 0, 0, null));
    }

    @Test
    void createSignature_ThrowsWhenModelMissing() {
        when(userLookupService.requireById(5L)).thenReturn(user());
        when(modelRepository.findByIdAndOrganizationId(11L, 41L)).thenReturn(Optional.empty());

        assertThrows(ModelDoesNotExistsException.class,
                () -> service.createSignature(5L, 11L, Map.of("x", "int"), "sig", 1, 0, 0, null));
    }

    @Test
    void getSignature_ThrowsWhenOwnerScopedSignatureMissing() {
        when(userLookupService.requireById(5L)).thenReturn(user());
        when(signatureRepository.findByIdAndOrganizationId(99L, 41L)).thenReturn(Optional.empty());

        assertThrows(SignatureDoesNotExistsException.class, () -> service.getSignature(5L, 99L));
    }

    @Test
    void getSignatureByModelId_ThrowsWhenOwnerScopedModelMissing() {
        when(userLookupService.requireById(5L)).thenReturn(user());
        when(modelRepository.findByIdAndOrganizationId(11L, 41L)).thenReturn(Optional.empty());

        assertThrows(ModelDoesNotExistsException.class, () -> service.getSignatureByModelId(5L, 11L));
    }

    @Test
    void getSignatureByModelId_ReturnsList() {
        when(userLookupService.requireById(5L)).thenReturn(user());
        when(modelRepository.findByIdAndOrganizationId(11L, 41L)).thenReturn(Optional.of(model()));
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
        model.setOrganization(organization());
        model.setName("demo");
        return model;
    }

    private Organization organization() {
        Organization organization = new Organization();
        organization.setId(41L);
        organization.setName("Org");
        organization.setSlug("org");
        organization.setCreatedBy(user());
        return organization;
    }
}

