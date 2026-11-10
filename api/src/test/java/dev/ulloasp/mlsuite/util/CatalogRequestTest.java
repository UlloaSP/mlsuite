package dev.ulloasp.mlsuite.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;

import org.junit.jupiter.api.Test;

/** The query of every server-owned catalog, and the one refusal a catalog gives a value it does not offer. */
class CatalogRequestTest {

    @Test
    void missingParametersKeepTheCatalogDefaults() {
        CatalogRequest request = new CatalogRequest(null, null, null, null, null);

        assertEquals(new CatalogRequest(0, 24, "", "all", "updated"), request);
    }

    @Test
    void givenParametersAreKeptWithTheSearchStripped() {
        assertEquals(new CatalogRequest(2, 100, "risk", "open", "name"),
                new CatalogRequest(2, 100, "  risk ", "open", "name"));
    }

    @Test
    void aPageOrSizeOutOfRangeIsRefused() {
        assertEquals("Invalid page '-1'; expected 0 or more", refusal(() -> new CatalogRequest(-1, null, null, null, null)));
        assertEquals("Invalid size '0'; expected 1 to 100", refusal(() -> new CatalogRequest(null, 0, null, null, null)));
        assertEquals("Invalid size '101'; expected 1 to 100",
                refusal(() -> new CatalogRequest(null, 101, null, null, null)));
    }

    @Test
    void aCatalogWithOneOrderRefusesANamedSort() {
        CatalogRequest unsorted = new CatalogRequest(null, null, null, "open", null);

        assertSame(unsorted, unsorted.requireOneOrder());
        assertEquals("Unknown sort 'name'; expected one of: updated",
                refusal(() -> new CatalogRequest(null, null, null, null, "name").requireOneOrder()));
    }

    @Test
    void aCatalogWithoutChoicesRefusesAFilterOrASort() {
        new CatalogRequest(null, null, "x", null, null).requireNoChoices();

        assertEquals("Unknown filter 'open'; expected one of: all",
                refusal(() -> new CatalogRequest(null, null, null, "open", null).requireNoChoices()));
        assertEquals("Unknown sort 'name'; expected one of: updated",
                refusal(() -> new CatalogRequest(null, null, null, null, "name").requireNoChoices()));
    }

    @Test
    void requireAnswersAnOfferedValueAndRefusesAnyOtherNamingWhatIsOffered() {
        List<String> sorts = List.of("updated", "name", "created");

        assertEquals("name", CatalogValues.require("sort", "name", sorts));
        assertEquals("Unknown sort 'bogus'; expected one of: updated, name, created",
                refusal(() -> CatalogValues.require("sort", "bogus", sorts)));
        assertEquals("Unknown filter 'null'; expected one of: all",
                refusal(() -> CatalogValues.require("filter", null, List.of("all"))));
    }

    private static String refusal(Runnable read) {
        return assertThrows(IllegalArgumentException.class, read::run).getMessage();
    }
}
