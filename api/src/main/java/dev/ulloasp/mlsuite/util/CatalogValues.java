package dev.ulloasp.mlsuite.util;

import java.util.Collection;

/**
 * The one way a catalog refuses a query value it does not know: the parameter, the value and what
 * the catalog accepts, answered as 400 by {@link DomainExceptionHandler}.
 */
public final class CatalogValues {

    private CatalogValues() {
    }

    /** {@code value} itself when {@code allowed} holds it. */
    public static String require(String parameter, String value, Collection<String> allowed) {
        if (value != null && allowed.contains(value)) {
            return value;
        }
        throw unknown(parameter, value, allowed);
    }

    /** The refusal of {@code value}, for a catalog that maps its accepted values in a switch. */
    public static IllegalArgumentException unknown(String parameter, String value, Collection<String> allowed) {
        return new IllegalArgumentException("Unknown " + parameter + " '" + value + "'; expected one of: "
                + String.join(", ", allowed));
    }
}
