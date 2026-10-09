package dev.ulloasp.mlsuite.invitation.application.dto;

import java.util.List;

/**
 * One page of an organization's invitations. {@code totalInvitations} counts all of them, whatever
 * the search or status filter, so a filtered list can say how many it leaves out.
 */
public record InvitationCatalogDto(
        List<InvitationDto> items,
        int page,
        int size,
        long totalItems,
        boolean hasNext,
        long totalInvitations) {
}
