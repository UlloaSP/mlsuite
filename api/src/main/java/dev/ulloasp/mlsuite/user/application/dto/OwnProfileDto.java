package dev.ulloasp.mlsuite.user.application.dto;

/**
 * Their own profile, as its owner sees it whether or not it is public: what anyone else would read,
 * and how much their personal account holds, which nobody else is told.
 */
public record OwnProfileDto(PublicProfileDto profile, long models, long schemas, long plugins, long inferences) {
}
