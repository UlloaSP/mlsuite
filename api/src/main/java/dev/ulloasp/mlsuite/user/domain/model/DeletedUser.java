package dev.ulloasp.mlsuite.user.domain.model;

import jakarta.annotation.Nullable;

/** Who an author is once they are gone: everything they wrote stays, and reads as theirs by this name. */
public final class DeletedUser {

    public static final String NAME = "Deleted user";

    private DeletedUser() {
    }

    public static String nameOf(@Nullable User user) {
        return user == null ? NAME : user.getFullName();
    }
}
