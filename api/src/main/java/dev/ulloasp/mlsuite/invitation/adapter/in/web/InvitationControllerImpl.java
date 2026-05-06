package dev.ulloasp.mlsuite.invitation.adapter.in.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.invitation.application.dto.CreateInvitationRequest;
import dev.ulloasp.mlsuite.invitation.application.dto.BulkInvitationRequest;
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
    public ResponseEntity<List<InvitationDto>> listInvitations(Authentication authentication, Long organizationId) {
        return ResponseEntity.ok(invitationManagementUseCase.listInvitations(currentUserResolver.resolve(authentication).userId(), organizationId));
    }

    @Override
    public ResponseEntity<InvitationDto> createInvitation(
            Authentication authentication,
            Long organizationId,
            CreateInvitationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(invitationManagementUseCase.createInvitation(currentUserResolver.resolve(authentication).userId(), organizationId, request));
    }

    @Override
    public ResponseEntity<InvitationDto> resendInvitation(Authentication authentication, Long organizationId, Long invitationId) {
        return ResponseEntity.ok(invitationManagementUseCase.resendInvitation(
                currentUserResolver.resolve(authentication).userId(),
                organizationId,
                invitationId));
    }

    @Override
    public ResponseEntity<Void> revokeInvitation(Authentication authentication, Long organizationId, Long invitationId) {
        invitationManagementUseCase.revokeInvitation(currentUserResolver.resolve(authentication).userId(), organizationId, invitationId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> bulkRevokeInvitations(Authentication authentication, Long organizationId, BulkInvitationRequest request) {
        invitationManagementUseCase.bulkRevokeInvitations(
                currentUserResolver.resolve(authentication).userId(),
                organizationId,
                request.invitationIds());
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<List<InvitationDto>> listPendingForUser(Authentication authentication) {
        return ResponseEntity.ok(invitationManagementUseCase.listPendingForUser(currentUserResolver.resolve(authentication).userId()));
    }

    @Override
    public ResponseEntity<InvitationDto> acceptInvitation(Authentication authentication, String token) {
        return ResponseEntity.ok(invitationManagementUseCase.acceptInvitation(currentUserResolver.resolve(authentication).userId(), token));
    }

    @Override
    public ResponseEntity<Void> declineInvitation(Authentication authentication, String token) {
        invitationManagementUseCase.declineInvitation(currentUserResolver.resolve(authentication).userId(), token);
        return ResponseEntity.noContent().build();
    }
}
