package dev.ulloasp.mlsuite.invitation.application.port.in;

import java.util.List;

import dev.ulloasp.mlsuite.invitation.application.dto.CreateInvitationRequest;
import dev.ulloasp.mlsuite.invitation.application.dto.InvitationDto;

public interface InvitationManagementUseCase {

    List<InvitationDto> listInvitations(Long userId, Long organizationId);

    InvitationDto createInvitation(Long userId, Long organizationId, CreateInvitationRequest request);

    void revokeInvitation(Long userId, Long organizationId, Long invitationId);

    InvitationDto acceptInvitation(Long userId, String token);

    void declineInvitation(Long userId, String token);

    List<InvitationDto> listPendingForUser(Long userId);
}
