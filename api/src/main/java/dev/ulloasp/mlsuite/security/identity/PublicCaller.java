package dev.ulloasp.mlsuite.security.identity;

/**
 * Who a request to the public surface is counted against: the account when the request carries a
 * session, otherwise the network it came from. {@code key} names that account or network without
 * holding an address: {@link PublicCallerArgumentResolver} stores only a keyed hash of it.
 */
public record PublicCaller(boolean signedIn, String key) {
}
