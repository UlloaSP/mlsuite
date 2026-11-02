package dev.ulloasp.mlsuite.audit.application.dto;

import java.util.List;

import org.springframework.data.domain.Slice;

/**
 * One page of the audit log. It carries no total: the log grows with everything that happens,
 * and counting every matching row on each page would read the whole table. {@code hasNext} says
 * whether more entries follow.
 */
public record AuditEventPageDto(List<AuditEventDto> items, int page, int size, boolean hasNext) {

    public static AuditEventPageDto of(Slice<?> slice, List<AuditEventDto> items) {
        return new AuditEventPageDto(items, slice.getNumber(), slice.getSize(), slice.hasNext());
    }
}
