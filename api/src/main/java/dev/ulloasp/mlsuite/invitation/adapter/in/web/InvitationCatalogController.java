package dev.ulloasp.mlsuite.invitation.adapter.in.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.invitation.application.dto.InvitationCandidateDto;
import dev.ulloasp.mlsuite.invitation.application.dto.InvitationCatalogDto;
import dev.ulloasp.mlsuite.invitation.application.dto.InvitationDto;
import dev.ulloasp.mlsuite.invitation.application.usecase.InvitationCatalogService;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class InvitationCatalogController {
    private final InvitationCatalogService invitations;

    @GetMapping("/api/organizations/{organizationId}/invitations/catalog")
    public InvitationCatalogDto invitationCatalog(CurrentUser user, @PathVariable Long organizationId,
            @ModelAttribute CatalogRequest request) {
        return invitations.list(user.userId(), organizationId, request);
    }

    @GetMapping("/api/organizations/{organizationId}/invitation-candidates/catalog")
    public PageDto<InvitationCandidateDto> invitationCandidateCatalog(CurrentUser user,
            @PathVariable Long organizationId, @ModelAttribute CatalogRequest request) {
        return invitations.candidates(user.userId(), organizationId, request);
    }

    @GetMapping("/api/invitations/pending/catalog")
    public PageDto<InvitationDto> pendingInvitationCatalog(CurrentUser user,
            @ModelAttribute CatalogRequest request) {
        return invitations.pending(user.userId(), request);
    }
}
