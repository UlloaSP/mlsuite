package dev.ulloasp.mlsuite.schema.application.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import dev.ulloasp.mlsuite.schema.application.service.PublicForm.ReportRoute;

class PublicRunReportsTest {

    private static final Map<String, Object> FIRST = Map.of("kind", "regressor", "output", 0, "values", List.of(1.5));
    private static final Map<String, Object> SECOND = Map.of("kind", "regressor", "output", 1, "values", List.of(2.5));
    private static final Map<String, Object> EXPLANATION = Map.of("kind", "Crystal Tree", "explanation", "path");
    private static final List<Object> ANSWERED = List.of(FIRST, SECOND, EXPLANATION);

    @Test
    void answerTo_RoutesEachPredictionToTheReportMappedToItsOutput() {
        assertSame(FIRST, PublicRunReports.answerTo(route("regressor", "0"), ANSWERED));
        assertSame(SECOND, PublicRunReports.answerTo(route("regressor", "1"), ANSWERED));
    }

    @Test
    void answerTo_LeavesOutAReportMappedToNoOutputOfTheModel() {
        assertNull(PublicRunReports.answerTo(route("regressor", "2"), ANSWERED));
        assertNull(PublicRunReports.answerTo(route("classifier", "0"), ANSWERED));
    }

    @Test
    void answerTo_RoutesAnExplanationByItsKind() {
        assertSame(EXPLANATION, PublicRunReports.answerTo(route("Crystal Tree", "explanation"), ANSWERED));
    }

    @Test
    void asWorkspaceStores_KeepsTheClassTheModelDecides() {
        Map<String, Object> report = new LinkedHashMap<>(Map.of("mapping", List.of("0", "1"),
                "probabilities", List.of(0.263, 0.737), "prediction", "0"));

        PublicRunReports.asWorkspaceStores("classifier", report);

        assertEquals("0", report.get("prediction"));
        assertEquals(List.of("0", "1"), report.get("labels"));
    }

    @Test
    void asWorkspaceStores_ReadsAModelThatDecidesNoClassAsItsMostProbableOne() {
        Map<String, Object> report = new LinkedHashMap<>(Map.of("mapping", List.of("low", "high"),
                "probabilities", List.of(0.2, 0.8)));
        report.put("prediction", null);

        PublicRunReports.asWorkspaceStores("classifier", report);

        assertEquals("high", report.get("prediction"));
    }

    private static ReportRoute route(String kind, String target) {
        return new ReportRoute("out0", 11L, kind, 0, "Report", target, false, false);
    }
}
