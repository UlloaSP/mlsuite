package dev.ulloasp.mlsuite.schema.catalog;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;

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
    private final String sortKeyLocale;

    private InferenceCatalogText(ULocale locale) {
        numbers = NumberFormatter.withLocale(locale)
                .precision(Precision.maxFraction(3))
                .roundingMode(RoundingMode.HALF_UP);
        cells = collator(locale, Collator.PRIMARY, true);
        choices = collator(locale, Collator.TERTIARY, true);
        options = collator(locale, Collator.TERTIARY, false);
        // Keyed by what decides the order (the collation data the locale resolved to and how it writes
        // numbers), not by the tag a browser sent, so the tags a member can make up share a few keys.
        sortKeyLocale = cells.getLocale(ULocale.ACTUAL_LOCALE).toLanguageTag() + "|"
                + ((RuleBasedCollator) cells).getRules().hashCode() + "|" + format(-1234567.891) + "|"
                + cells.getVersion() + "|" + InferenceSortKeys.PROJECTION_VERSION;
    }

    /**
     * What stored sort keys are valid for: this locale, as this collator orders it, of rows as this
     * version of the projection shows them. Keys made under another ICU or projection are not read.
     */
    String sortKeyLocale() {
        return sortKeyLocale;
    }

    /** Language, script and region of the tag only: its extensions could reorder rows unseen by the key. */
    static InferenceCatalogText of(String locale) {
        ULocale tag = ULocale.forLanguageTag(locale);
        return new InferenceCatalogText(new ULocale(tag.getLanguage(), tag.getScript(), tag.getCountry()));
    }

    /** What a cell shows: a number in the locale's digits, Yes or No, text as written, or compact JSON. */
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
        return value instanceof String text ? text : InferenceJsonValues.json(value, false);
    }

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
