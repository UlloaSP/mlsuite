package dev.ulloasp.mlsuite.search.application.service;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.regex.Pattern;

public final class SearchTextMatcher {

    private static final Pattern CAMEL_BOUNDARY = Pattern.compile("(?<=[\\p{Ll}\\p{Nd}])(?=\\p{Lu})");
    private static final Pattern MARKS = Pattern.compile("\\p{M}+");
    private static final Pattern SEPARATORS = Pattern.compile("[^\\p{Alnum}]+");
    private static final Pattern SPACES = Pattern.compile("\\s+");

    private SearchTextMatcher() {
    }

    public static SearchTextQuery parse(String raw) {
        String trimmed = raw == null ? "" : raw.trim();
        String normalized = normalize(trimmed);
        List<String> tokens = tokenize(normalized);
        return new SearchTextQuery(trimmed, normalized, tokens);
    }

    public static int score(SearchTextQuery query, String... terms) {
        String text = normalize(String.join(" ", Arrays.stream(terms)
                .filter(Objects::nonNull)
                .toList()));
        if (text.isBlank()) {
            return -1;
        }
        List<String> candidateTokens = tokenize(text);
        int score = text.contains(query.normalized()) ? 0 : 8;
        for (String token : query.tokens()) {
            int tokenScore = bestTokenScore(token, text, candidateTokens);
            if (tokenScore < 0) {
                return -1;
            }
            score += tokenScore;
        }
        return score;
    }

    private static int bestTokenScore(String queryToken, String text, List<String> candidateTokens) {
        if (candidateTokens.contains(queryToken)) {
            return 0;
        }
        if (candidateTokens.stream().anyMatch(token -> token.startsWith(queryToken))) {
            return 1;
        }
        if (candidateTokens.stream().anyMatch(token -> token.contains(queryToken))) {
            return 2;
        }
        return text.contains(queryToken) ? 3 : -1;
    }

    private static String normalize(String value) {
        String spacedCamel = CAMEL_BOUNDARY.matcher(value).replaceAll(" ");
        String decomposed = Normalizer.normalize(spacedCamel, Normalizer.Form.NFD);
        String withoutMarks = MARKS.matcher(decomposed).replaceAll("");
        String separated = SEPARATORS.matcher(withoutMarks).replaceAll(" ");
        return SPACES.matcher(separated.toLowerCase(Locale.ROOT).trim()).replaceAll(" ");
    }

    private static List<String> tokenize(String normalized) {
        if (normalized.isBlank()) {
            return List.of();
        }
        return Arrays.stream(normalized.split(" "))
                .filter(token -> !token.isBlank())
                .toList();
    }

    public record SearchTextQuery(String raw, String normalized, List<String> tokens) {
        public boolean tooShort(int minLength) {
            return normalized.length() < minLength;
        }

        public String prefilter() {
            return tokens.stream()
                    .max(Comparator.comparingInt(String::length))
                    .orElse(normalized);
        }
    }
}
