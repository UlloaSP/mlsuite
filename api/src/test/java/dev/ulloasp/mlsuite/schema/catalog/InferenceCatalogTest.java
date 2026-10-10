package dev.ulloasp.mlsuite.schema.catalog;

import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogFixtures.AGE;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogFixtures.TEXT;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogFixtures.ages;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogFixtures.data;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogFixtures.object;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogFixtures.rows;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogFixtures.table;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.function.Consumer;

import org.junit.jupiter.api.Test;
import org.mockito.invocation.InvocationOnMock;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import dev.ulloasp.mlsuite.schema.application.dto.InferenceTableDto;
import dev.ulloasp.mlsuite.schema.application.dto.InferenceTableRunDto;
import dev.ulloasp.mlsuite.schema.application.dto.PredictionRunCatalogItemDto;
import dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogOrder.Ranked;
import dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogRequest.Condition;
import dev.ulloasp.mlsuite.schema.catalog.InferenceRowProjector.Row;

/** The table over projected rows: what it filters, how it orders, and which page a request gets. */
class InferenceCatalogTest {

    private static final long MEMBER = 7L;
    private static final long OUTSIDER = 9L;

    @Test
    void filtersAndSortsBeforePagingAndSelectsTheWholeResult() throws Exception {
        InferenceCatalogService service = serving(table(data(0)));

        var first = service.page(MEMBER, request(0, "", "createdAt.desc"));
        var second = service.page(MEMBER, request(1, "", "createdAt.desc"));
        assertEquals(2, first.totalItems());
        assertTrue(first.hasNext());
        assertFalse(second.hasNext());
        assertEquals(2L, first.items().getFirst().item().id());
        assertEquals(1L, second.items().getFirst().item().id());
        assertEquals(1L, service.page(MEMBER, request(0, "", "createdAt.asc")).items().getFirst().item().id());
        assertEquals(2, service.selection(MEMBER, request(0, "", "createdAt.desc")).size());

        var olderThanForty = request(0, "", "createdAt.desc", new Condition(AGE, "gt", "40"));
        assertEquals(1, service.page(MEMBER, olderThanForty).totalItems());
        assertEquals(2L, service.selection(MEMBER, olderThanForty).getFirst().id());
        assertEquals(1L, service.page(MEMBER, request(0, "", AGE + ".asc")).items().getFirst().item().id());
        var youngestSecond = service.page(MEMBER, request(1, "", AGE + ".asc"));
        assertEquals(2L, youngestSecond.items().getFirst().item().id());
        assertEquals(2, youngestSecond.totalItems());
        assertFalse(youngestSecond.hasNext());
        assertEquals(1, service.page(MEMBER, request(0, "900", "createdAt.desc")).totalItems());

        var metadata = service.metadata(MEMBER, request(0, "absent", "createdAt.desc"));
        assertTrue(metadata.columns().stream()
                .anyMatch(column -> column.id().equals(AGE) && column.kind() == InferenceValueKind.number));
        // The newest snapshot names a column, and a schema's inputs come before its outputs and feedback.
        assertEquals(List.of("Age (years)", "Income", "Score", "Score · v2 · Assessment · grace@example.com"),
                metadata.columns().stream().map(InferenceCatalogColumnDto::label).toList());

        assertThrows(ResponseStatusException.class, () -> service.page(OUTSIDER, olderThanForty));
        assertThrows(ResponseStatusException.class, () -> service.page(OUTSIDER, request(0, "", "createdAt.desc")));
        assertThrows(ResponseStatusException.class, () -> service.metadata(OUTSIDER, olderThanForty));
        assertThrows(ResponseStatusException.class, () -> service.selection(OUTSIDER, olderThanForty));
    }

    @Test
    void rejectsMalformedConditionsAndClampsPaging() {
        assertThrows(ResponseStatusException.class,
                () -> request(0, "", "createdAt.desc", Arrays.asList((Condition) null)));
        assertThrows(ResponseStatusException.class,
                () -> request(0, "", "createdAt.desc", new Condition("age", null, "1")));
        assertThrows(ResponseStatusException.class,
                () -> request(0, "", "createdAt.desc", new Condition("age", "bad", "1")));
        assertThrows(ResponseStatusException.class,
                () -> request(0, "", "createdAt.desc", Collections.nCopies(101, new Condition("age", "eq", "1"))));
        assertEquals(0, request(-4, "", "createdAt.desc").page());
    }

    @Test
    void usesTheSameRoundedLocaleTextForCellsSearchConditionsAndChoices() throws Exception {
        assertEquals("1.235", TEXT.format(1.2345));
        assertEquals("-1.235", TEXT.format(-1.2345));
        assertEquals("1,235", InferenceCatalogText.of("es-ES").format(1.2345));
        assertEquals("12,34,567.895", InferenceCatalogText.of("en-IN").format(1234567.895));

        ObjectNode data = data(0);
        object(data, "/runs/0/inputData").put("age", 1.2345);
        Row row = rows(data).getFirst();
        assertEquals("1.235", row.dto().displayValues().get(AGE));
        assertTrue(matches(row, request(0, "1.235", "createdAt.desc", new Condition(AGE, "is", "1.235"))));
        InferenceCatalogMetadata metadata = new InferenceCatalogMetadata(TEXT);
        metadata.accept(row);
        assertTrue(metadata.finish().stream()
                .anyMatch(column -> column.id().equals(AGE) && column.choices().contains("1.235")));
    }

    @Test
    void matchesEveryConditionOperatorAndTheFeedbackFilter() throws Exception {
        JsonNode data = ages(52, 31, null, "n/a");
        assertEquals(List.of(1L), matching(data, new Condition(AGE, "eq", "52")));
        assertEquals(List.of(1L), matching(data, new Condition(AGE, "is", "52")));
        assertEquals(List.of(1L), matching(data, new Condition(AGE, "gt", " 31 ")));
        assertEquals(List.of(2L, 1L), matching(data, new Condition(AGE, "gte", "0x1F")));
        assertEquals(List.of(2L), matching(data, new Condition(AGE, "lt", "52")));
        assertEquals(List.of(2L, 1L), matching(data, new Condition(AGE, "lte", "52")));
        assertEquals(List.of(4L), matching(data, new Condition(AGE, "contains", " N/ ")));
        assertEquals(List.of(3L), matching(data, new Condition(AGE, "empty", "")));
        assertEquals(List.of(4L, 2L, 1L), matching(data, new Condition(AGE, "notEmpty", "")));
        assertEquals(List.of(), matching(data, new Condition(AGE, "gt", "")));
        assertEquals(List.of(1L), matching(data, new Condition(AGE, "gte", "32"), new Condition(AGE, "lte", "60")));

        // A column is numeric when every value it holds reads as a finite number, and text otherwise.
        assertEquals(InferenceValueKind.number, kind(ages("0x1A", " 12 ", 3)));
        assertEquals(InferenceValueKind.text, kind(ages("3D", 3)));
        assertEquals(InferenceValueKind.text, kind(ages("Infinity", 3)));
        assertEquals(InferenceValueKind.text, kind(ages((Object) null)));

        InferenceCatalogService service = serving(table(data(0)));
        assertEquals(List.of(2L), ids(service.selection(MEMBER, request(0, "", "COMPLETED", "createdAt.desc"))));
        assertEquals(List.of(1L), ids(service.selection(MEMBER, request(0, "", "PENDING", "createdAt.desc"))));
        assertEquals(List.of(), ids(service.selection(MEMBER, request(0, "", "NOT_REQUIRED", "createdAt.desc"))));
        assertEquals(1, service.page(MEMBER, request(0, "", "PENDING", "createdAt.desc")).totalItems());
    }

    @Test
    void ordersEveryColumnTotallyWithMissingValuesLastAndTiesNewestFirst() throws Exception {
        // Runs are numbered oldest first: run 1 is the oldest and the last one the newest.
        InferenceCatalogService missing = serving(table(ages(52, null, 31, null)));
        assertEquals(List.of(3L, 1L, 4L, 2L), ids(missing.selection(MEMBER, request(0, "", AGE + ".asc"))));
        assertEquals(List.of(1L, 3L, 4L, 2L), ids(missing.selection(MEMBER, request(0, "", AGE + ".desc"))));
        for (String tied : List.of("status.asc", "status.desc", "schema.asc", "origin.desc", "feedbackStatus.asc",
                "name.sideways", "unknown.asc")) {
            assertEquals(List.of(4L, 3L, 2L, 1L), ids(missing.selection(MEMBER, request(0, "", tied))), tied);
        }
        ObjectNode sameMoment = ages(1, 1, 1);
        sameMoment.get("runs").forEach(run -> object(run, "/summary").put("createdAt", "2026-07-01T08:00:00Z"));
        assertEquals(List.of(1L, 2L, 3L),
                ids(serving(table(sameMoment)).selection(MEMBER, request(0, "", AGE + ".desc"))));

        // 999 < 1234.5 as numbers, yet "1,234.5" < "5" < "999" as text: comparing mixed pairs as text has no order.
        JsonNode mixed = ages(1234.5, 999, "5", "abc", 7, "Abc", "10");
        InferenceCatalogService service = serving(table(mixed));
        assertEquals(List.of(5L, 2L, 1L, 3L, 7L, 6L, 4L),
                ids(service.selection(MEMBER, request(0, "", AGE + ".asc"))));
        assertEquals(List.of(6L, 4L, 7L, 3L, 1L, 2L, 5L),
                ids(service.selection(MEMBER, request(0, "", AGE + ".desc"))));
        for (String sort : List.of(AGE + ".asc", AGE + ".desc", "name.asc", "createdAt.asc")) {
            InferenceCatalogOrder order = InferenceCatalogOrder.of(sort, TEXT);
            List<Ranked> ranked = rows(mixed).stream().map(order::rank).toList();
            Comparator<Ranked> comparator = order.comparator();
            for (Ranked a : ranked) {
                for (Ranked b : ranked) {
                    assertEquals(Integer.signum(comparator.compare(a, b)), -Integer.signum(comparator.compare(b, a)));
                    assertEquals(a == b, comparator.compare(a, b) == 0, "only a row ties with itself");
                    for (Ranked c : ranked) {
                        assertFalse(comparator.compare(a, b) < 0 && comparator.compare(b, c) < 0
                                && comparator.compare(a, c) >= 0, sort + " is not transitive");
                    }
                }
            }
        }
        // Text sorts as the browser sorted it: digit runs by value, spaces before letters, case ignored.
        InferenceCatalogService names = serving(
                table(ages(1, 2, 3, 4, 5), "case 10", "Case 9", "Newark", "New York", "a b"));
        assertEquals(List.of(5L, 2L, 1L, 4L, 3L), ids(names.selection(MEMBER, request(0, "", "name.asc"))));
    }

    /** A service over a reader that holds exactly the given table and refuses the outsider. */
    private static InferenceCatalogService serving(InferenceTableDto data) {
        InferenceCatalogReader reader = mock(InferenceCatalogReader.class);
        doAnswer(call -> deliver(call, 2, data)).when(reader).scan(eq(MEMBER), any(), any());
        doAnswer(call -> deliver(call, 2, only(data, call.getArgument(1))))
                .when(reader).selected(eq(MEMBER), any(), any());
        when(reader.page(eq(MEMBER), any(), anyBoolean(), anyInt(), anyInt(), any())).thenAnswer(call -> {
            Comparator<PredictionRunCatalogItemDto> newestFirst = Comparator
                    .comparing(PredictionRunCatalogItemDto::createdAt).reversed();
            boolean oldestFirst = call.getArgument(2);
            int size = call.getArgument(4);
            List<Long> page = data.runs().stream().map(InferenceTableRunDto::summary)
                    .sorted(oldestFirst ? newestFirst.reversed() : newestFirst)
                    .map(PredictionRunCatalogItemDto::id)
                    .skip((long) call.<Integer>getArgument(3) * size).limit(size).toList();
            deliver(call, 5, only(data, page));
            return (long) data.runs().size();
        });
        when(reader.choices(eq(MEMBER), any()))
                .thenReturn(new InferenceCatalogReader.Choices(data.runs().size(), List.of(), List.of()));
        ResponseStatusException forbidden = new ResponseStatusException(HttpStatus.FORBIDDEN);
        doThrow(forbidden).when(reader).scan(eq(OUTSIDER), any(), any());
        when(reader.page(eq(OUTSIDER), any(), anyBoolean(), anyInt(), anyInt(), any())).thenThrow(forbidden);
        return new InferenceCatalogService(reader);
    }

    private static Object deliver(InvocationOnMock call, int consumer, InferenceTableDto table) {
        call.<Consumer<InferenceTableDto>>getArgument(consumer).accept(table);
        return null;
    }

    private static InferenceTableDto only(InferenceTableDto data, List<Long> ids) {
        List<InferenceTableRunDto> runs = ids.stream()
                .map(id -> data.runs().stream().filter(run -> run.summary().id().equals(id)).findFirst().orElseThrow())
                .toList();
        return new InferenceTableDto(runs, data.results(), data.feedback(), data.versions());
    }

    private static InferenceValueKind kind(JsonNode data) throws Exception {
        InferenceCatalogMetadata metadata = new InferenceCatalogMetadata(TEXT);
        rows(data).forEach(metadata::accept);
        return metadata.finish().stream().filter(column -> column.id().equals(AGE)).findFirst().orElseThrow().kind();
    }

    /** The ids of the rows every condition lets through, newest first. */
    private static List<Long> matching(JsonNode data, Condition... conditions) throws Exception {
        InferenceCatalogRequest request = request(0, "", "createdAt.desc", conditions);
        return rows(data).stream().filter(row -> matches(row, request)).map(row -> row.dto().item().id())
                .sorted(Comparator.reverseOrder()).toList();
    }

    private static boolean matches(Row row, InferenceCatalogRequest request) {
        return InferenceCatalogFilter.of(request).matches(row);
    }

    private static List<Long> ids(List<PredictionRunCatalogItemDto> items) {
        return items.stream().map(PredictionRunCatalogItemDto::id).toList();
    }

    private static InferenceCatalogRequest request(int page, String query, String sort, Condition... conditions) {
        return request(page, query, sort, Arrays.asList(conditions));
    }

    private static InferenceCatalogRequest request(int page, String query, String sort, List<Condition> conditions) {
        return new InferenceCatalogRequest(
                page, 1, query, "all", "all", "all", "all", "all", sort, "en-US", conditions);
    }

    private static InferenceCatalogRequest request(int page, String query, String feedback, String sort) {
        return new InferenceCatalogRequest(
                page, 1, query, "all", "all", "all", feedback, "all", sort, "en-US", List.of());
    }
}
