package dev.ulloasp.mlsuite.invitation.application.port.in;

import java.util.List;

import dev.ulloasp.mlsuite.invitation.application.dto.CreateInvitationRequest;
import dev.ulloasp.mlsuite.invitation.application.dto.InvitationDto;

public interface InvitationManagementUseCase {

    List<InvitationDto> listInvitations(Long userId, Long organizationId);

    InvitationDto createInvitation(Long userId, Long organizationId, CreateInvitationRequest request);

    InvitationDto resendInvitation(Long userId, Long organizationId, Long invitationId);

    void revokeInvitation(Long userId, Long organizationId, Long invitationId);

    void bulkRevokeInvitations(Long userId, Long organizationId, List<Long> invitationIds);

    InvitationDto acceptInvitation(Long userId, String token);

    void declineInvitation(Long userId, String token);

    List<InvitationDto> listPendingForUser(Long userId);
}
