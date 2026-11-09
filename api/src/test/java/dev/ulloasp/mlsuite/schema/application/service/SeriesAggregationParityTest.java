package dev.ulloasp.mlsuite.schema.application.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.io.InputStream;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import tools.jackson.databind.json.JsonMapper;

/**
 * The server computes a public run's series aggregations as the workspace's MLForm does. The
 * fixture's expected values are MLForm 0.2.0's own results, and the frontend's
 * series-aggregation-parity test holds MLForm to the same file, so a change to either side
 * breaks one of the two. Results agree to within a few units in the last place: pow, exp and log
 * may round their last bit differently between JavaScript engines and platforms.
 */
class SeriesAggregationParityTest {

    private static final double TOLERANCE = 4 * Math.ulp(1d);

    @Test
    void everyAggregationEqualsMlFormsOnTheSharedFixture() throws IOException {
        Map<?, ?> fixture;
        try (InputStream json = getClass().getResourceAsStream("/series-aggregations.json")) {
            fixture = JsonMapper.builder().build().readValue(json, Map.class);
        }
        Map<?, ?> series = (Map<?, ?>) fixture.get("series");
        List<?> cases = (List<?>) fixture.get("cases");

        for (Object item : cases) {
            Map<?, ?> fixtureCase = (Map<?, ?>) item;
            Map<Object, Object> aggregation = new LinkedHashMap<>((Map<?, ?>) fixtureCase.get("aggregation"));
            aggregation.put("source", "value");
            Number actual = SeriesAggregation.calculate((List<?>) series.get(fixtureCase.get("series")), aggregation);
            String name = fixtureCase.get("series") + " " + aggregation;
            if (fixtureCase.get("expected") instanceof Number expected) {
                assertNotNull(actual, name);
                double want = expected.doubleValue();
                assertTrue(Math.abs(actual.doubleValue() - want) <= TOLERANCE * Math.abs(want),
                        name + ": expected " + want + " but was " + actual);
            } else {
                assertNull(actual, name);
            }
        }
        assertEquals(588, cases.size());
    }

    @Test
    void aWholeResultIsSentAsTheBrowserWritesIt() {
        List<Map<String, Object>> rows = List.of(Map.of("value", 90), Map.of("value", 110));

        assertEquals(100L, SeriesAggregation.calculate(rows, Map.of("operation", "mean", "source", "value")));
        assertEquals(2L, SeriesAggregation.calculate(rows, Map.of("operation", "count", "source", "value")));
        assertEquals(10L, SeriesAggregation.calculate(rows,
                Map.of("operation", "stddev", "ddof", 0, "source", "value")));
        assertEquals(0.1, SeriesAggregation.calculate(List.of(Map.of("value", 0.1)),
                Map.of("operation", "mean", "source", "value")));
    }
}
