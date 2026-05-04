package dev.ulloasp.mlsuite.invitation.adapter.in.web;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import dev.ulloasp.mlsuite.invitation.application.dto.CreateInvitationRequest;
import dev.ulloasp.mlsuite.invitation.application.dto.InvitationDto;
import jakarta.validation.Valid;

public interface InvitationController {

    @GetMapping("/api/organizations/{organizationId}/invitations")
    ResponseEntity<List<InvitationDto>> listInvitations(OAuth2AuthenticationToken authentication, @PathVariable Long organizationId);

    @PostMapping("/api/organizations/{organizationId}/invitations")
    ResponseEntity<InvitationDto> createInvitation(
            OAuth2AuthenticationToken authentication,
            @PathVariable Long organizationId,
            @Valid @RequestBody CreateInvitationRequest request);

    @DeleteMapping("/api/organizations/{organizationId}/invitations/{invitationId}")
    ResponseEntity<Void> revokeInvitation(
            OAuth2AuthenticationToken authentication,
            @PathVariable Long organizationId,
            @PathVariable Long invitationId);

    @GetMapping("/api/invitations/pending")
    ResponseEntity<List<InvitationDto>> listPendingForUser(OAuth2AuthenticationToken authentication);

    @PostMapping("/api/invitations/{token}/accept")
    ResponseEntity<InvitationDto> acceptInvitation(
            OAuth2AuthenticationToken authentication,
            @PathVariable String token);

    @PostMapping("/api/invitations/{token}/decline")
    ResponseEntity<Void> declineInvitation(
            OAuth2AuthenticationToken authentication,
            @PathVariable String token);
}
