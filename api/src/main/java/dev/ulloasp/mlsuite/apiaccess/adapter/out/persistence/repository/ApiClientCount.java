package dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository;

/** A count by id: the bookmarks of a client, or the clients of an organization. */
public record ApiClientCount(Long id, long count) {
}
