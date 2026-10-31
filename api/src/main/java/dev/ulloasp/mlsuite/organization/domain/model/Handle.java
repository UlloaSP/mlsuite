package dev.ulloasp.mlsuite.organization.domain.model;

import java.util.Locale;
import java.util.Set;
import java.util.function.Predicate;
import java.util.regex.Pattern;

import dev.ulloasp.mlsuite.organization.domain.exception.HandleTakenException;

/**
 * The one definition of a handle, the name usernames and organization slugs share a namespace in.
 * Handles are stored lowercase, so two spellings of one name never coexist.
 */
public final class Handle {

    public static final int MAX_LENGTH = 39;

    private static final Pattern FORMAT = Pattern.compile("[a-z0-9]+(-[a-z0-9]+)*");

    /** Top-level segments of the app and its API, which a handle must never be mistaken for. */
    private static final Set<String> RESERVED = Set.of(
            "about", "account", "accounts", "admin", "administrator", "api", "api-access", "assets", "auth",
            "docs", "explore", "help", "home", "inferences", "invitations", "login", "logout", "members",
            "mlsuite", "models", "new", "notifications", "organization", "organizations", "plugins", "predict",
            "profile", "public", "register", "review", "reviews", "roles", "root", "schemas", "search",
            "security", "settings", "signin", "signup", "static", "status", "superadmin", "support", "system",
            "user", "users", "workspace", "workspaces");

    private Handle() {
    }

    /** The handle {@code raw} spells, case aside, or a validation error saying what a handle is. */
    public static String parse(String raw) {
        String handle = raw == null ? "" : raw.strip().toLowerCase(Locale.ROOT);
        if (handle.length() > MAX_LENGTH || !FORMAT.matcher(handle).matches()) {
            throw new IllegalArgumentException(
                    "A handle is up to " + MAX_LENGTH + " letters or digits, with single hyphens between them.");
        }
        return handle;
    }

    /** The handle {@code raw} spells, once it is known to be neither reserved nor {@code taken}. */
    public static String claim(String raw, Predicate<String> taken) {
        String handle = parse(raw);
        if (RESERVED.contains(handle)) {
            throw new IllegalArgumentException("The handle '" + handle + "' is reserved.");
        }
        if (taken.test(handle)) {
            throw new HandleTakenException(handle);
        }
        return handle;
    }

    /** What a name reads as a handle, for an organization created without choosing one. */
    public static String fromName(String name) {
        String handle = name.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("^-", "");
        return (handle.length() > MAX_LENGTH ? handle.substring(0, MAX_LENGTH) : handle).replaceAll("-$", "");
    }
}
