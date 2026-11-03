package dev.ulloasp.mlsuite.admin.purge;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.util.CatalogPages;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import lombok.RequiredArgsConstructor;

/**
 * Asks for purges and follows them. Asking locks the target and closes it in the transaction that
 * writes the job, so no new work starts in it from then on; the worker does the rest.
 */
@Service
@Transactional
@RequiredArgsConstructor
public class PurgeRequestService {

    private final PurgeTargets targets;
    private final PurgePreviewCounts previews;
    private final PurgeLedger ledger;
    private final UserRepository users;
    private final AuditLogService auditLog;

    @Transactional(readOnly = true)
    public PageDto<PurgeJobDto> list(CatalogRequest request) {
        String search = CatalogPages.likeLiteral(request.search());
        long total = ledger.count(search, request.filter());
        List<PurgeJobDto> items = ledger.page(search, request.filter(), request.page(), request.size());
        return new PageDto<>(items, request.page(), request.size(), total,
                (long) (request.page() + 1) * request.size() < total);
    }

    @Transactional(readOnly = true)
    public PurgePreviewDto preview(Long actorId, PurgeScope scope, Long targetId) {
        PurgeTargets.Target target = targets.find(actorId, scope, targetId);
        return new PurgePreviewDto(scope, targetId, target.label(), target.confirmation(), previews.count(target),
                target.refusal());
    }

    public PurgeJobDto request(Long actorId, RequestPurgeRequest request) {
        targets.lock(request.scope(), request.targetId());
        PurgeTargets.Target target = targets.find(actorId, request.scope(), request.targetId());
        if (target.refusal() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, target.refusal());
        }
        if (!target.confirmation().equals(request.confirmation())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Type the exact name to confirm.");
        }
        return ledger.find(start(target, users.findById(actorId).orElseThrow())).orElseThrow();
    }

    /** Called with the account's own checks passed: their password, and the rules of who may go. */
    public void requestOwnAccount(User user) {
        targets.lock(PurgeScope.USER, user.getId());
        start(targets.find(null, PurgeScope.USER, user.getId()), user);
    }

    private Long start(PurgeTargets.Target target, User requester) {
        targets.close(target);
        Long jobId = ledger.insert(target, requester.getId(), requester.getFullName());
        auditLog.record(AuditActor.user(requester.getId()), target.organizationId(), AuditAction.PURGE_REQUEST, jobId,
                AuditDetails.of("scope", target.scope(), "targetId", target.id(), "target", target.label(),
                        "counts", previews.count(target)));
        return jobId;
    }

    public PurgeJobDto retry(Long actorId, Long jobId) {
        PurgeJobDto job = ledger.find(jobId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Purge not found"));
        if (!ledger.retry(jobId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only a failed purge can be retried.");
        }
        auditLog.record(AuditActor.user(actorId), null, AuditAction.PURGE_RETRY, jobId,
                AuditDetails.of("scope", job.scope(), "target", job.targetLabel(), "failedWith", job.error()));
        return ledger.find(jobId).orElseThrow();
    }
}
