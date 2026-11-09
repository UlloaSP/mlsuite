package dev.ulloasp.mlsuite.schema.catalog;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.FormatStyle;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import com.ibm.icu.number.LocalizedNumberFormatter;
import com.ibm.icu.number.NumberFormatter;
import com.ibm.icu.number.Precision;
import com.ibm.icu.text.CollationKey;
import com.ibm.icu.text.Collator;
import com.ibm.icu.text.RuleBasedCollator;
import com.ibm.icu.util.ULocale;

/**
 * One locale's cell text and orderings, as the browser's {@code toLocaleString} and
 * {@code localeCompare} gave them. Built once per request: a formatter or collator per value would
 * cost more than the value.
 */
final class InferenceCatalogText {

    private final LocalizedNumberFormatter numbers;
    private final Collator cells;
    private final Collator choices;
    private final Collator options;
    private final DateTimeFormatter days;

    private InferenceCatalogText(ULocale locale) {
        numbers = NumberFormatter.withLocale(locale)
                .precision(Precision.maxFraction(3))
                .roundingMode(RoundingMode.HALF_UP);
        cells = collator(locale, Collator.PRIMARY, true);
        choices = collator(locale, Collator.TERTIARY, true);
        options = collator(locale, Collator.TERTIARY, false);
        days = DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM).withLocale(locale.toLocale()).withZone(ZoneOffset.UTC);
    }

    /**
     * Language, script and region of the tag only: its extensions would pick another collation or
     * numbering system, and the table orders and writes as a browser does by default for the language.
     */
    static InferenceCatalogText of(String locale) {
        ULocale tag = ULocale.forLanguageTag(locale);
        return new InferenceCatalogText(new ULocale(tag.getLanguage(), tag.getScript(), tag.getCountry()));
    }

    /**
     * What a cell shows: a number in the locale's digits, Yes or No, text as written, a series' rows
     * as the run page's table reads them, or compact JSON.
     */
    String format(Object value) {
        if (!InferenceCatalogValues.filled(value)) {
            return "";
        }
        if (value instanceof Boolean flag) {
            return flag ? "Yes" : "No";
        }
        if (value instanceof Number number) {
            return format(number);
        }
        if (value instanceof List<?> rows && !rows.isEmpty() && rows.stream().allMatch(Map.class::isInstance)) {
            return rows.stream().map(row -> seriesRow((Map<?, ?>) row)).collect(Collectors.joining("; "));
        }
        return value instanceof String text ? text : InferenceJsonValues.json(value, false);
    }

    /** One series row: a date as its day (a form stores a day as its midnight UTC), then each value. */
    private String seriesRow(Map<?, ?> row) {
        return row.values().stream()
                .map(cell -> cell instanceof String text && DAY.matcher(text).matches()
                        ? days.format(Instant.parse(text.length() == 10 ? text + "T00:00:00Z" : text))
                        : cell == null ? "—" : format(cell))
                .collect(Collectors.joining(" · "));
    }

    private static final Pattern DAY = Pattern.compile("\\d{4}-\\d{2}-\\d{2}(T00:00:00(\\.0+)?Z)?");

    /** A cell's place among text cells: digit runs by value, ignoring case and accents. */
    CollationKey cellKey(String text) {
        return cells.getCollationKey(text);
    }

    /** The order of text cells, for lists sorted like a column. */
    Comparator<String> cellOrder() {
        return cells::compare;
    }

    /** The order of a column's distinct values: digit runs by value, case and accents told apart. */
    Comparator<String> choiceOrder() {
        return choices::compare;
    }

    /** The order of schema and bookmark names in a filter. */
    Comparator<String> optionOrder() {
        return options::compare;
    }

    private String format(Number number) {
        double value = number.doubleValue();
        // Intl rounds a number's shortest decimal text, so 1.2345 shows as 1.235; negative zero has no such text.
        boolean decimal = Double.isFinite(value) && Double.doubleToRawLongBits(value) != Long.MIN_VALUE;
        return (decimal ? numbers.format(new BigDecimal(number.toString())) : numbers.format(value)).toString();
    }

    private static Collator collator(ULocale locale, int strength, boolean numeric) {
        RuleBasedCollator collator = (RuleBasedCollator) Collator.getInstance(locale);
        collator.setStrength(strength);
        collator.setNumericCollation(numeric);
        return collator.freeze();
    }
}
