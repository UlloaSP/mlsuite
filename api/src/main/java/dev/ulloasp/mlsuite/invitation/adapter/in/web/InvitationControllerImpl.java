package dev.ulloasp.mlsuite.invitation.adapter.in.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.invitation.application.dto.CreateInvitationRequest;
import dev.ulloasp.mlsuite.invitation.application.dto.InvitationDto;
import dev.ulloasp.mlsuite.invitation.application.port.in.InvitationManagementUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;

@RestController
public class InvitationControllerImpl implements InvitationController {

    private final CurrentUserResolver currentUserResolver;
    private final InvitationManagementUseCase invitationManagementUseCase;

    public InvitationControllerImpl(
            CurrentUserResolver currentUserResolver,
            InvitationManagementUseCase invitationManagementUseCase) {
        this.currentUserResolver = currentUserResolver;
        this.invitationManagementUseCase = invitationManagementUseCase;
    }

    @Override
    public ResponseEntity<List<InvitationDto>> listInvitations(OAuth2AuthenticationToken authentication, Long organizationId) {
        return ResponseEntity.ok(invitationManagementUseCase.listInvitations(currentUserResolver.resolve(authentication).userId(), organizationId));
    }

    @Override
    public ResponseEntity<InvitationDto> createInvitation(
            OAuth2AuthenticationToken authentication,
            Long organizationId,
            CreateInvitationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(invitationManagementUseCase.createInvitation(currentUserResolver.resolve(authentication).userId(), organizationId, request));
    }

    @Override
    public ResponseEntity<Void> revokeInvitation(OAuth2AuthenticationToken authentication, Long organizationId, Long invitationId) {
        invitationManagementUseCase.revokeInvitation(currentUserResolver.resolve(authentication).userId(), organizationId, invitationId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<InvitationDto> acceptInvitation(OAuth2AuthenticationToken authentication, String token) {
        return ResponseEntity.ok(invitationManagementUseCase.acceptInvitation(currentUserResolver.resolve(authentication).userId(), token));
    }

    @Override
    public ResponseEntity<Void> declineInvitation(OAuth2AuthenticationToken authentication, String token) {
        invitationManagementUseCase.declineInvitation(currentUserResolver.resolve(authentication).userId(), token);
        return ResponseEntity.noContent().build();
    }
}
