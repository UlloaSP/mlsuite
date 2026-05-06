package dev.ulloasp.mlsuite.invitation.adapter.in.web;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import dev.ulloasp.mlsuite.invitation.application.dto.CreateInvitationRequest;
import dev.ulloasp.mlsuite.invitation.application.dto.BulkInvitationRequest;
import dev.ulloasp.mlsuite.invitation.application.dto.InvitationDto;
import jakarta.validation.Valid;

public interface InvitationController {

    @GetMapping("/api/organizations/{organizationId}/invitations")
    ResponseEntity<List<InvitationDto>> listInvitations(Authentication authentication, @PathVariable Long organizationId);

    @PostMapping("/api/organizations/{organizationId}/invitations")
    ResponseEntity<InvitationDto> createInvitation(
            Authentication authentication,
            @PathVariable Long organizationId,
            @Valid @RequestBody CreateInvitationRequest request);

    @PostMapping("/api/organizations/{organizationId}/invitations/{invitationId}/resend")
    ResponseEntity<InvitationDto> resendInvitation(
            Authentication authentication,
            @PathVariable Long organizationId,
            @PathVariable Long invitationId);

    @DeleteMapping("/api/organizations/{organizationId}/invitations/{invitationId}")
    ResponseEntity<Void> revokeInvitation(
            Authentication authentication,
            @PathVariable Long organizationId,
            @PathVariable Long invitationId);

    @PostMapping("/api/organizations/{organizationId}/invitations/bulk-revoke")
    ResponseEntity<Void> bulkRevokeInvitations(
            Authentication authentication,
            @PathVariable Long organizationId,
            @Valid @RequestBody BulkInvitationRequest request);

    @GetMapping("/api/invitations/pending")
    ResponseEntity<List<InvitationDto>> listPendingForUser(Authentication authentication);

    @PostMapping("/api/invitations/{token}/accept")
    ResponseEntity<InvitationDto> acceptInvitation(
            Authentication authentication,
            @PathVariable String token);

    @PostMapping("/api/invitations/{token}/decline")
    ResponseEntity<Void> declineInvitation(
            Authentication authentication,
            @PathVariable String token);
}
