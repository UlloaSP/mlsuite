package dev.ulloasp.mlsuite.invitation.application.usecase;

import java.util.Arrays;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.Locale;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.invitation.adapter.out.persistence.repository.InvitationRepository;
import dev.ulloasp.mlsuite.invitation.application.dto.InvitationCandidateDto;
import dev.ulloasp.mlsuite.invitation.application.dto.InvitationCatalogDto;
import dev.ulloasp.mlsuite.invitation.application.dto.InvitationDto;
import dev.ulloasp.mlsuite.invitation.domain.model.Invitation;
import dev.ulloasp.mlsuite.invitation.domain.model.InvitationStatus;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.util.CatalogPages;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import lombok.RequiredArgsConstructor;

/** Invitation catalogs, read with the permissions of the invitation lists they page. */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class InvitationCatalogService {
    private final UserLookupService users;
    private final InvitationRepository invitationRepository;
    private final UserRepository userRepository;
    private final WorkspaceAuthorizationService authorization;

    public InvitationCatalogDto list(Long userId, Long organizationId, CatalogRequest request) {
        authorization.require(userId, organizationId, PermissionKey.VIEW_INVITATIONS);
        boolean includeTokens = authorization.has(userId, organizationId, PermissionKey.MANAGE_INVITATIONS);
        Page<Invitation> page = invitationRepository.findAll(matching(organizationId, request),
                CatalogPages.pageable(request, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("id"))));
        return new InvitationCatalogDto(
                page.getContent().stream().map(invitation -> InvitationDto.from(invitation, includeTokens)).toList(),
                page.getNumber(), page.getSize(), page.getTotalElements(), page.hasNext(),
                invitationRepository.countByOrganizationId(organizationId));
    }

    public PageDto<InvitationCandidateDto> candidates(Long userId, Long organizationId, CatalogRequest request) {
        authorization.require(userId, organizationId, PermissionKey.INVITE_MEMBERS);
        Page<User> page = userRepository.findInvitationCandidates(organizationId,
                CatalogPages.likeLiteral(request.search()),
                CatalogPages.pageable(request, Sort.by(Sort.Order.asc("email").ignoreCase(), Sort.Order.asc("id"))));
        return PageDto.of(page, page.getContent().stream().map(InvitationCandidateDto::from).toList());
    }

    public PageDto<InvitationDto> pending(Long userId, CatalogRequest request) {
        String email = users.requireById(userId).getEmail().toLowerCase(Locale.ROOT);
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        Specification<Invitation> matching = (root, query, builder) -> builder.and(
                builder.equal(root.get("email"), email),
                builder.equal(root.get("status"), InvitationStatus.PENDING),
                builder.greaterThan(root.get("expiresAt"), now),
                builder.or(
                        builder.like(builder.lower(root.get("email")), CatalogPages.likeLiteral(request.search()), '!'),
                        builder.like(builder.lower(root.get("organization").get("name")),
                                CatalogPages.likeLiteral(request.search()), '!')));
        Page<Invitation> page = invitationRepository.findAll(matching,
                CatalogPages.pageable(request, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("id"))));
        return PageDto.of(page, page.getContent().stream().map(InvitationDto::from).toList());
    }

    private Specification<Invitation> matching(Long organizationId, CatalogRequest request) {
        return (root, query, builder) -> {
            var inOrganization = builder.equal(root.get("organization").get("id"), organizationId);
            var email = builder.like(builder.lower(root.get("email")),
                    CatalogPages.likeLiteral(request.search()), '!');
            if (request.filter().equalsIgnoreCase("all")) {
                return builder.and(inOrganization, email);
            }
            // A filter that names no status matches no invitation.
            var status = status(request.filter())
                    .map(value -> builder.equal(root.get("status"), value))
                    .orElseGet(builder::disjunction);
            return builder.and(inOrganization, email, status);
        };
    }

    private Optional<InvitationStatus> status(String filter) {
        return Arrays.stream(InvitationStatus.values())
                .filter(status -> status.name().equalsIgnoreCase(filter))
                .findFirst();
    }
}
