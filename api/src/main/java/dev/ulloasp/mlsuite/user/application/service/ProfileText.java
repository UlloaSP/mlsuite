package dev.ulloasp.mlsuite.user.application.service;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;
import java.util.Set;

/** What a person may write about themselves: plain text, and addresses a browser opens safely. */
final class ProfileText {

    private static final Set<String> SCHEMES = Set.of("http", "https");

    private ProfileText() {
    }

    /** One line of text, or null when blank. */
    static String line(String raw, String label) {
        String text = raw.strip();
        if (text.chars().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException(label + " must be a single line of text.");
        }
        return text.isEmpty() ? null : text;
    }

    /** Text of several lines, or null when blank. */
    static String lines(String raw, String label) {
        String text = raw.replace("\r\n", "\n").strip();
        if (text.chars().anyMatch(character -> character != '\n' && Character.isISOControl(character))) {
            throw new IllegalArgumentException(label + " must be plain text.");
        }
        return text.isEmpty() ? null : text;
    }

    /** An http(s) address with a host of its own, or null when blank. */
    static String url(String raw, String label) {
        String text = raw.strip();
        if (text.isEmpty()) return null;
        if (!isWebAddress(text)) {
            throw new IllegalArgumentException(label + " must be an http or https address.");
        }
        return text;
    }

    private static boolean isWebAddress(String text) {
        try {
            URI address = new URI(text);
            return address.getScheme() != null && SCHEMES.contains(address.getScheme().toLowerCase(Locale.ROOT))
                    && address.getHost() != null && address.getRawUserInfo() == null;
        } catch (URISyntaxException failure) {
            return false;
        }
    }
}
