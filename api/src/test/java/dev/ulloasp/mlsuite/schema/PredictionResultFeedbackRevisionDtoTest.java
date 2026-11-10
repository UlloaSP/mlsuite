package dev.ulloasp.mlsuite.schema;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.OffsetDateTime;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import dev.ulloasp.mlsuite.principal.domain.model.Principal;
import dev.ulloasp.mlsuite.principal.domain.model.PrincipalKind;
import dev.ulloasp.mlsuite.schema.application.dto.PredictionResultFeedbackRevisionDto;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedbackChange;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedbackRevision;

/** An answer's history says whether its author and whoever changed it were a visitor. */
class PredictionResultFeedbackRevisionDtoTest {

    private static final long VISITOR = 1L;
    private static final long MEMBER = 2L;
    private static final Map<Long, Principal> PRINCIPALS = Map.of(
            VISITOR, principal(PrincipalKind.VISITOR, null, null),
            MEMBER, principal(PrincipalKind.USER, 7L, "Ada Member"));

    @Test
    void aVisitorWhoChangedTheirAnswerIsTheVisitor() {
        PredictionResultFeedbackRevisionDto dto = dto(VISITOR, VISITOR);

        assertTrue(dto.byVisitor());
        assertTrue(dto.changedByVisitor());
        assertNull(dto.changedByUserId());
        assertNull(dto.changedByName());
    }

    @Test
    void aMemberWhoRemovedAVisitorsAnswerIsNamed() {
        PredictionResultFeedbackRevisionDto dto = dto(VISITOR, MEMBER);

        assertTrue(dto.byVisitor());
        assertFalse(dto.changedByVisitor());
        assertEquals(7L, dto.changedByUserId());
        assertEquals("Ada Member", dto.changedByName());
    }

    @Test
    void aMembersOwnAnswerIsChangedByThem() {
        PredictionResultFeedbackRevisionDto dto = dto(MEMBER, MEMBER);

        assertFalse(dto.byVisitor());
        assertFalse(dto.changedByVisitor());
        assertEquals("Ada Member", dto.authorName());
    }

    private static PredictionResultFeedbackRevisionDto dto(long author, long changedBy) {
        PredictionResultFeedbackRevision revision = new PredictionResultFeedbackRevision();
        ReflectionTestUtils.setField(revision, "authorId", author);
        ReflectionTestUtils.setField(revision, "changedById", changedBy);
        ReflectionTestUtils.setField(revision, "change", PredictionResultFeedbackChange.UPDATED);
        ReflectionTestUtils.setField(revision, "changedAt", OffsetDateTime.now());
        return PredictionResultFeedbackRevisionDto.from(revision, PRINCIPALS, Map.of());
    }

    private static Principal principal(PrincipalKind kind, Long userId, String userName) {
        Principal principal = new Principal();
        ReflectionTestUtils.setField(principal, "kind", kind);
        ReflectionTestUtils.setField(principal, "userId", userId);
        ReflectionTestUtils.setField(principal, "userName", userName);
        return principal;
    }
}
