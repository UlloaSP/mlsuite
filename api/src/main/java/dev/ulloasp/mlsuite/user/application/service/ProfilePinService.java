package dev.ulloasp.mlsuite.user.application.service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.ProfilePinRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.domain.model.ProfilePin;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import lombok.RequiredArgsConstructor;

/**
 * Which published bookmarks a person keeps at the top of their profile. Only their own personal
 * account's readable bookmarks can be pinned; {@link SchemaBookmark} removes a pin from then on.
 * Runs in {@link UserProfileService}'s transaction.
 */
@Service
@RequiredArgsConstructor
class ProfilePinService {

    private final OrganizationRepository organizationRepository;
    private final SchemaBookmarkRepository bookmarkRepository;
    private final ProfilePinRepository pinRepository;
    private final AuditLogService auditLog;

    void replace(Long userId, List<String> publicIds) {
        List<String> wanted = publicIds.stream().distinct().toList();
        Map<String, SchemaBookmark> bookmarks = readable(userId, wanted);
        List<ProfilePin> current = pinRepository.findByUserIdOrderBySlotAsc(userId);
        Map<Long, ProfilePin> pinned = current.stream()
                .collect(Collectors.toMap(pin -> pin.getBookmark().getId(), Function.identity()));
        List<String> before = names(current);
        current.stream().filter(pin -> !wanted.contains(pin.getBookmark().getPublicId())).forEach(pinRepository::delete);
        for (int slot = 0; slot < wanted.size(); slot++) {
            SchemaBookmark bookmark = bookmarks.get(wanted.get(slot));
            ProfilePin pin = pinned.get(bookmark.getId());
            if (pin == null) {
                pinRepository.save(new ProfilePin(userId, bookmark, slot));
            } else {
                pin.setSlot(slot);
            }
        }
        List<String> after = wanted.stream().map(id -> bookmarks.get(id).getName()).toList();
        if (!before.equals(after)) {
            auditLog.record(AuditActor.user(userId), null, AuditAction.USER_PROFILE_UPDATE, userId,
                    AuditDetails.of("pins", AuditDetails.changed(before, after)));
        }
    }

    private Map<String, SchemaBookmark> readable(Long userId, List<String> publicIds) {
        if (publicIds.isEmpty()) return Map.of();
        Long accountId = organizationRepository.findByOwnerUserId(userId).orElseThrow().getId();
        Map<String, SchemaBookmark> bookmarks = bookmarkRepository.findPublishedIn(publicIds, accountId).stream()
                .collect(Collectors.toMap(SchemaBookmark::getPublicId, Function.identity()));
        if (bookmarks.size() != publicIds.size()) {
            throw new IllegalArgumentException("Only your own published bookmarks can be pinned.");
        }
        return bookmarks;
    }

    private static List<String> names(List<ProfilePin> pins) {
        return pins.stream().sorted(Comparator.comparingInt(ProfilePin::getSlot))
                .map(pin -> pin.getBookmark().getName()).toList();
    }
}
