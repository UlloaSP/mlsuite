package dev.ulloasp.mlsuite.schema.catalog;

import java.math.BigInteger;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * JavaScript's own coercions. Persisted forms, answers and reports were written by a browser, so
 * their text, numbers and blanks mean what {@code String()}, {@code Number()} and {@code trim()}
 * say they mean.
 */
final class InferenceJsValues {

    /** A decimal literal or Infinity; every repetition is possessive, so a mismatch is found in one pass. */
    private static final Pattern DECIMAL = Pattern.compile(
            "[+-]?(?:Infinity|(?:\\d++(?:\\.\\d*+)?+|\\.\\d++)(?:[eE][+-]?\\d++)?+)");

    /** A radix literal with more significant bits than this is infinite, whatever its remaining digits are. */
    private static final int MAX_FINITE_BITS = 1024;

    private InferenceJsValues() {
    }

    /** {@code String(value)}: an array is its items joined by commas, and a plain object has no text of its own. */
    static String string(Object value) {
        if (value == null) {
            return "null";
        }
        if (value instanceof Number number) {
            return InferenceJsonValues.number(number);
        }
        if (value instanceof List<?> items) {
            StringBuilder joined = new StringBuilder();
            for (int index = 0; index < items.size(); index++) {
                Object item = items.get(index);
                joined.append(index == 0 ? "" : ",").append(item == null ? "" : string(item));
            }
            return joined.toString();
        }
        return value instanceof Map<?, ?> ? "[object Object]" : value.toString();
    }

    /** {@code String(record[key])}, where a key the record lacks reads as "undefined". */
    static String string(Map<?, ?> record, String key) {
        return record.containsKey(key) ? string(record.get(key)) : "undefined";
    }

    /**
     * {@code Number(text)}: an optionally signed decimal with an optional exponent, a signed Infinity,
     * or an unsigned 0x, 0o or 0b integer, ignoring surrounding whitespace. Blank text is zero and
     * anything else is NaN.
     */
    static double number(String text) {
        String literal = trim(text);
        if (literal.isEmpty()) {
            return 0;
        }
        if (literal.length() > 2 && literal.charAt(0) == '0') {
            int radix = radix(literal.charAt(1));
            if (radix > 0) {
                return integer(literal.substring(2), radix);
            }
        }
        return DECIMAL.matcher(literal).matches() ? Double.parseDouble(literal) : Double.NaN;
    }

    /** {@code text.trim()}, which also strips no-break spaces and byte order marks. */
    static String trim(String text) {
        int start = 0;
        int end = text.length();
        while (start < end && whitespace(text.charAt(start))) {
            start++;
        }
        while (end > start && whitespace(text.charAt(end - 1))) {
            end--;
        }
        return text.substring(start, end);
    }

    static boolean blank(String text) {
        for (int index = 0; index < text.length(); index++) {
            if (!whitespace(text.charAt(index))) {
                return false;
            }
        }
        return true;
    }

    /** What a regular expression's {@code \s} and {@code trim()} both treat as whitespace. */
    static boolean whitespace(char character) {
        return switch (character) {
            case '\t', '\n', '\u000B', '\f', '\r', ' ', '\u00A0', '\u1680', '\u2028', '\u2029', '\u202F',
                    '\u205F', '\u3000', '\uFEFF' -> true;
            default -> character >= '\u2000' && character <= '\u200A';
        };
    }

    private static int radix(char prefix) {
        return switch (prefix) {
            case 'x', 'X' -> 16;
            case 'o', 'O' -> 8;
            case 'b', 'B' -> 2;
            default -> 0;
        };
    }

    private static double integer(String digits, int radix) {
        int significant = -1;
        for (int index = 0; index < digits.length(); index++) {
            if (Character.digit(digits.charAt(index), radix) < 0 || digits.charAt(index) > 'f') {
                return Double.NaN;
            }
            if (significant < 0 && digits.charAt(index) != '0') {
                significant = index;
            }
        }
        if (significant < 0) {
            return 0;
        }
        int bitsPerDigit = Integer.numberOfTrailingZeros(radix);
        // Deciding infinity from the length keeps a megabyte of digits from ever reaching BigInteger.
        if ((long) (digits.length() - significant) * bitsPerDigit > MAX_FINITE_BITS + bitsPerDigit) {
            return Double.POSITIVE_INFINITY;
        }
        return new BigInteger(digits.substring(significant), radix).doubleValue();
    }
}
