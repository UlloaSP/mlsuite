package dev.ulloasp.mlsuite.schema.review.application.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewAssigneeRepository;
import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewReviewerDto;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReview;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewAssignee;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@Service
public class SchemaReviewAssignmentService {
    private final OrganizationMembershipRepository memberships;
    private final SchemaReviewAssigneeRepository assignees;
    private final WorkspaceAuthorizationService authorization;

    public SchemaReviewAssignmentService(OrganizationMembershipRepository memberships,
            SchemaReviewAssigneeRepository assignees, WorkspaceAuthorizationService authorization) {
        this.memberships = memberships;
        this.assignees = assignees;
        this.authorization = authorization;
    }

    public List<SchemaReviewReviewerDto> eligibleReviewers(Long actorUserId, Long organizationId) {
        authorization.requireReviewManagement(actorUserId, organizationId);
        return eligibleMembers(organizationId).stream()
                .map(OrganizationMembership::getUser)
                .map(SchemaReviewReviewerDto::from)
                .toList();
    }

    public void assign(SchemaReview review, List<Long> reviewerIds) {
        Map<Long, User> eligible = new LinkedHashMap<>();
        eligibleMembers(review.getOrganization().getId())
                .forEach(membership -> eligible.put(membership.getUser().getId(), membership.getUser()));
        List<Long> selected = reviewerIds.stream().distinct().toList();
        if (selected.isEmpty() || selected.size() != reviewerIds.size() || !eligible.keySet().containsAll(selected)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reviewer selection invalid");
        }
        selected.forEach(id -> assignees.save(new SchemaReviewAssignee(review, eligible.get(id))));
    }

    public boolean isAssigned(Long reviewId, Long userId) {
        return assignees.existsByReviewIdAndUserId(reviewId, userId);
    }

    private List<OrganizationMembership> eligibleMembers(Long organizationId) {
        return memberships.findActiveByOrganizationIdOrderByCreatedAtAsc(organizationId)
                .stream()
                .filter(membership -> membership.getUser().isEnabled())
                .filter(membership -> authorization
                        .effectiveOrganizationPermissions(membership.getUser().getId(), organizationId)
                        .contains(PermissionKey.REVIEW))
                .toList();
    }
}
