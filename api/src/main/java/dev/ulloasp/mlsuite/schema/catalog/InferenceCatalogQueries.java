package dev.ulloasp.mlsuite.schema.catalog;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.schema.application.dto.InferenceTableRunDto;
import dev.ulloasp.mlsuite.schema.application.dto.PredictionResultDto;
import dev.ulloasp.mlsuite.schema.application.dto.PredictionResultFeedbackDto;
import dev.ulloasp.mlsuite.schema.application.dto.PredictionRunCatalogItemDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaModelBindingDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaVersionDto;
import dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogMetadataDto.Option;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.util.CatalogPages;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;

/**
 * Every read of the inference catalog, as plain values. No entity is loaded, so reading a hundred
 * runs never drags in their organization, authors, visitors or model artifacts, and nothing is left
 * in the persistence context for a long scan to accumulate.
 */
@Component
@RequiredArgsConstructor
class InferenceCatalogQueries {

    private static final String DTO = "dev.ulloasp.mlsuite.schema.application.dto.";
    private static final String SUMMARY = "new " + DTO + """
            PredictionRunCatalogItemDto(
                r.id, r.name, r.status, r.origin, r.createdAt, r.updatedAt, s.id, s.name,
                v.id, v.version, v.name, b.id, b.name, r.createdByName, r.createdByEmail)
            """;
    private static final String SUMMARY_SOURCE = """
            FROM PredictionRun r JOIN r.schemaVersion v JOIN v.schema s LEFT JOIN r.schemaBookmark b
            WHERE s.organization.id = :organizationId AND r.id IN :ids
            """;

    private final EntityManager entities;

    long count(Long organizationId, InferenceCatalogScope scope) {
        CriteriaBuilder builder = entities.getCriteriaBuilder();
        CriteriaQuery<Long> query = builder.createQuery(Long.class);
        Root<PredictionRun> run = query.from(PredictionRun.class);
        query.select(builder.count(run)).where(scope.within(organizationId, run, builder));
        return entities.createQuery(query).getSingleResult();
    }

    /** Every run id of a scope, newest first and then by id: the table's order before any sorting. */
    List<Long> ids(Long organizationId, InferenceCatalogScope scope) {
        return ordered(organizationId, scope, false).getResultList();
    }

    /** One page of a scope's run ids by creation time, in either direction. */
    List<Long> ids(Long organizationId, InferenceCatalogScope scope, boolean oldestFirst, int offset, int limit) {
        return ordered(organizationId, scope, oldestFirst).setFirstResult(offset).setMaxResults(limit).getResultList();
    }

    List<Option> schemas(Long organizationId) {
        return options(organizationId, InferenceCatalogScope.organization(),
                run -> run.get("schemaVersion").get("schema"));
    }

    /** The bookmarks at least one run of the scope was made from. */
    List<Option> bookmarks(Long organizationId, InferenceCatalogScope scope) {
        return options(organizationId, scope, run -> run.join("schemaBookmark"));
    }

    PageDto<Option> optionPage(Long organizationId, InferenceCatalogScope scope, boolean bookmark,
            CatalogRequest request) {
        var builder = entities.getCriteriaBuilder();
        var query = builder.createQuery(Object[].class);
        var run = query.from(PredictionRun.class);
        Path<?> named = bookmark ? run.join("schemaBookmark") : run.get("schemaVersion").get("schema");
        var name = named.<String>get("name");
        query.multiselect(named.get("id"), name, builder.lower(name)).distinct(true)
                .where(scope.within(organizationId, run, builder),
                        builder.like(builder.lower(name), CatalogPages.likeLiteral(request.search()), '!'))
                .orderBy(builder.asc(builder.lower(name)), builder.asc(named.get("id")));
        var count = builder.createQuery(Long.class);
        var countedRun = count.from(PredictionRun.class);
        Path<?> counted = bookmark ? countedRun.join("schemaBookmark")
                : countedRun.get("schemaVersion").get("schema");
        count.select(builder.countDistinct(counted.get("id")))
                .where(scope.within(organizationId, countedRun, builder),
                        builder.like(builder.lower(counted.get("name")), CatalogPages.likeLiteral(request.search()), '!'));
        long total = entities.createQuery(count).getSingleResult();
        long offset = (long) request.page() * request.size();
        List<Option> items = offset >= total || offset > Integer.MAX_VALUE ? List.of()
                : entities.createQuery(query).setFirstResult((int) offset).setMaxResults(request.size())
                        .getResultList().stream().map(row -> new Option(String.valueOf(row[0]), (String) row[1])).toList();
        return new PageDto<>(items, request.page(), request.size(), total, offset + request.size() < total);
    }

    List<PredictionRunCatalogItemDto> summaries(Long organizationId, Collection<Long> ids) {
        return entities.createQuery("SELECT " + SUMMARY + SUMMARY_SOURCE, PredictionRunCatalogItemDto.class)
                .setParameter("organizationId", organizationId)
                .setParameter("ids", ids)
                .getResultList();
    }

    List<InferenceTableRunDto> runs(Long organizationId, Collection<Long> ids) {
        String select = "SELECT new " + DTO + "InferenceTableRunDto(" + SUMMARY + ", r.inputData) ";
        return entities.createQuery(select + SUMMARY_SOURCE, InferenceTableRunDto.class)
                .setParameter("organizationId", organizationId)
                .setParameter("ids", ids)
                .getResultList();
    }

    List<PredictionResultDto> results(Collection<Long> runIds) {
        return entities.createQuery("SELECT new " + DTO + """
                PredictionResultDto(
                    r.id, r.run.id, r.model.id, r.modelInput, r.output, r.status, r.errorMessage, r.errorJson,
                    r.createdAt)
                FROM PredictionResult r
                WHERE r.run.id IN :runIds
                ORDER BY r.run.id ASC, r.id ASC
                """, PredictionResultDto.class)
                .setParameter("runIds", runIds)
                .getResultList();
    }

    /** In a stable order: completion reads the last of several reviewers' answers to one question. */
    List<PredictionResultFeedbackDto> feedback(Collection<Long> runIds) {
        return entities.createQuery("SELECT new " + DTO + """
                PredictionResultFeedbackDto(
                    f.id, r.id, u.id, u.fullName, u.email, f.type, f.order, f.value, f.createdAt, f.updatedAt)
                FROM PredictionResultFeedback f JOIN f.result r LEFT JOIN f.user u
                WHERE r.run.id IN :runIds
                ORDER BY r.run.id ASC, r.id ASC, f.type ASC, f.order ASC, f.id ASC
                """, PredictionResultFeedbackDto.class)
                .setParameter("runIds", runIds)
                .getResultList();
    }

    /** Snapshots with their bindings; a bound model is read as its id and name, never as its artifact. */
    List<SchemaVersionDto> versions(Collection<Long> ids) {
        Map<Long, List<SchemaModelBindingDto>> bindings = entities.createQuery("SELECT new " + DTO + """
                SchemaModelBindingDto(b.id, b.schemaVersion.id, m.id, m.name, b.pluginPolicy)
                FROM SchemaModelBinding b JOIN b.model m
                WHERE b.schemaVersion.id IN :ids
                ORDER BY b.id ASC
                """, SchemaModelBindingDto.class)
                .setParameter("ids", ids)
                .getResultStream()
                .collect(Collectors.groupingBy(SchemaModelBindingDto::schemaVersionId));
        return entities.createQuery("""
                SELECT v.id, v.schema.id, v.version, v.name, v.formSchema, v.createdAt
                FROM SchemaVersion v
                WHERE v.id IN :ids
                """, Object[].class)
                .setParameter("ids", ids)
                .getResultStream()
                .map(row -> version(row, bindings.getOrDefault((Long) row[0], List.of())))
                .toList();
    }

    @SuppressWarnings("unchecked")
    private static SchemaVersionDto version(Object[] row, List<SchemaModelBindingDto> bindings) {
        return new SchemaVersionDto((Long) row[0], (Long) row[1], (Integer) row[2], (String) row[3],
                (Map<String, Object>) row[4], bindings, (OffsetDateTime) row[5]);
    }

    private TypedQuery<Long> ordered(Long organizationId, InferenceCatalogScope scope, boolean oldestFirst) {
        CriteriaBuilder builder = entities.getCriteriaBuilder();
        CriteriaQuery<Long> query = builder.createQuery(Long.class);
        Root<PredictionRun> run = query.from(PredictionRun.class);
        Path<OffsetDateTime> createdAt = run.get("createdAt");
        query.select(run.get("id"))
                .where(scope.within(organizationId, run, builder))
                .orderBy(oldestFirst ? builder.asc(createdAt) : builder.desc(createdAt), builder.asc(run.get("id")));
        return entities.createQuery(query);
    }

    private List<Option> options(Long organizationId, InferenceCatalogScope scope,
            Function<Root<PredictionRun>, Path<?>> owner) {
        CriteriaBuilder builder = entities.getCriteriaBuilder();
        CriteriaQuery<Object[]> query = builder.createQuery(Object[].class);
        Root<PredictionRun> run = query.from(PredictionRun.class);
        Path<?> named = owner.apply(run);
        query.multiselect(named.get("id"), named.get("name"))
                .distinct(true)
                .where(scope.within(organizationId, run, builder));
        return entities.createQuery(query).getResultList().stream()
                .map(row -> new Option(String.valueOf(row[0]), (String) row[1]))
                .toList();
    }
}
