package dev.ulloasp.mlsuite.invitation.adapter.in.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.invitation.application.dto.CreateInvitationRequest;
import dev.ulloasp.mlsuite.invitation.application.dto.BulkInvitationRequest;
import dev.ulloasp.mlsuite.invitation.application.dto.InvitationCandidateDto;
import dev.ulloasp.mlsuite.invitation.application.dto.InvitationDto;
import dev.ulloasp.mlsuite.invitation.application.port.in.InvitationManagementUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import jakarta.validation.Valid;

@RestController
@RequiredArgsConstructor
public class InvitationController {

    private final InvitationManagementUseCase invitationManagementUseCase;

    @GetMapping("/api/organizations/{organizationId}/invitations")
    public ResponseEntity<List<InvitationDto>> listInvitations(
            CurrentUser user,
            @PathVariable Long organizationId) {
        return ResponseEntity.ok(invitationManagementUseCase.listInvitations(user.userId(), organizationId));
    }

    @GetMapping("/api/organizations/{organizationId}/invitation-candidates")
    public ResponseEntity<List<InvitationCandidateDto>> listInvitationCandidates(
            CurrentUser user,
            @PathVariable Long organizationId) {
        return ResponseEntity.ok(invitationManagementUseCase.listInvitationCandidates(
                user.userId(),
                organizationId));
    }

    @PostMapping("/api/organizations/{organizationId}/invitations")
    public ResponseEntity<InvitationDto> createInvitation(
            CurrentUser user,
            @PathVariable Long organizationId,
            @Valid @RequestBody CreateInvitationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(invitationManagementUseCase.createInvitation(user.userId(), organizationId, request));
    }

    @PostMapping("/api/organizations/{organizationId}/invitations/{invitationId}/resend")
    public ResponseEntity<InvitationDto> resendInvitation(
            CurrentUser user,
            @PathVariable Long organizationId,
            @PathVariable Long invitationId) {
        return ResponseEntity.ok(invitationManagementUseCase.resendInvitation(
                user.userId(),
                organizationId,
                invitationId));
    }

    @DeleteMapping("/api/organizations/{organizationId}/invitations/{invitationId}")
    public ResponseEntity<Void> revokeInvitation(
            CurrentUser user,
            @PathVariable Long organizationId,
            @PathVariable Long invitationId) {
        invitationManagementUseCase.revokeInvitation(user.userId(), organizationId, invitationId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/organizations/{organizationId}/invitations/bulk-revoke")
    public ResponseEntity<Void> bulkRevokeInvitations(
            CurrentUser user,
            @PathVariable Long organizationId,
            @Valid @RequestBody BulkInvitationRequest request) {
        invitationManagementUseCase.bulkRevokeInvitations(
                user.userId(),
                organizationId,
                request.invitationIds());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/invitations/pending")
    public ResponseEntity<List<InvitationDto>> listPendingForUser(CurrentUser user) {
        return ResponseEntity.ok(invitationManagementUseCase.listPendingForUser(user.userId()));
    }

    @PostMapping("/api/invitations/{token}/accept")
    public ResponseEntity<InvitationDto> acceptInvitation(CurrentUser user, @PathVariable String token) {
        return ResponseEntity.ok(invitationManagementUseCase.acceptInvitation(user.userId(), token));
    }

    @PostMapping("/api/invitations/{token}/decline")
    public ResponseEntity<Void> declineInvitation(CurrentUser user, @PathVariable String token) {
        invitationManagementUseCase.declineInvitation(user.userId(), token);
        return ResponseEntity.noContent().build();
    }
}
