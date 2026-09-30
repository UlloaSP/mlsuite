package dev.ulloasp.mlsuite.openapi;

import java.lang.reflect.RecordComponent;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springdoc.core.utils.SpringDocUtils;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.type.TypeFactory;

import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.util.ErrorDto;
import io.swagger.v3.core.converter.AnnotatedType;
import io.swagger.v3.core.converter.ModelConverter;
import io.swagger.v3.core.converter.ModelConverterContext;
import io.swagger.v3.core.converter.ModelConverters;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.JsonSchema;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.servers.Server;
import jakarta.annotation.Nullable;

/**
 * Makes the generated spec state what Jackson actually does, because openapi-typescript turns
 * non-required properties into optional ones.
 *
 * <p>Jackson writes every record component, so each one is required and may be null only when it
 * is {@link Nullable}. {@code @JsonInclude(NON_NULL)} records omit null components instead. In
 * request-only schemas a missing key deserializes to null, so nullable components are optional.
 */
@TestConfiguration(proxyBeanMethods = false)
class OpenApiContractConventions {

    private static final String REF_PREFIX = "#/components/schemas/";

    static {
        SpringDocUtils.getConfig().addRequestWrapperToIgnore(CurrentUser.class);
    }

    @Bean
    OpenAPI mlsuiteOpenApi() {
        return new OpenAPI()
                .info(new Info().title("MLSuite API").version("contract"))
                .servers(List.of(new Server().url("/")));
    }

    @Bean
    ModelConverter recordNullabilityConverter() {
        return new ModelConverter() {
            @Override
            @SuppressWarnings("rawtypes")
            public Schema resolve(AnnotatedType type, ModelConverterContext context, Iterator<ModelConverter> chain) {
                Schema resolved = chain.hasNext() ? chain.next().resolve(type, context, chain) : null;
                Class<?> raw = TypeFactory.defaultInstance().constructType(type.getType()).getRawClass();
                if (resolved == null || !raw.isRecord()) {
                    return resolved;
                }
                Schema model = resolved.get$ref() == null
                        ? resolved
                        : context.getDefinedModels().get(resolved.get$ref().substring(REF_PREFIX.length()));
                if (model != null && model.getProperties() != null) {
                    applyRecordNullability(raw, model);
                }
                return resolved;
            }
        };
    }

    /** Every error response carries ErrorDto, but no controller names it in a signature. */
    @Bean
    OpenApiCustomizer errorSchema() {
        return openApi -> openApi.getComponents().getSchemas()
                .putAll(ModelConverters.getInstance(true).readAll(new AnnotatedType(ErrorDto.class)));
    }

    /**
     * swagger-core marks a model itself as null when a {@link Nullable} component is the first to
     * reference it. Nullability belongs to the referencing property, never to the model.
     */
    @Bean
    OpenApiCustomizer modelsAreNeverNull() {
        return openApi -> openApi.getComponents().getSchemas().values().stream()
                .filter(schema -> schema.getProperties() != null && schema.getTypes() != null)
                .forEach(schema -> schema.setTypes(new LinkedHashSet<>(List.of("object"))));
    }

    @Bean
    OpenApiCustomizer requestOnlyNullablesAreOptional() {
        return openApi -> {
            Map<String, Schema> schemas = openApi.getComponents().getSchemas();
            Set<String> requests = reachable(schemas, operations(openApi)
                    .map(Operation::getRequestBody)
                    .filter(body -> body != null)
                    .map(body -> body.getContent()));
            Set<String> responses = reachable(schemas, operations(openApi)
                    .flatMap(operation -> operation.getResponses().values().stream())
                    .map(response -> response.getContent()));
            requests.removeAll(responses);
            for (String name : requests) {
                Schema<?> schema = schemas.get(name);
                if (schema.getRequired() != null && schema.getProperties() != null) {
                    schema.getRequired().removeIf(property -> isNullable(schema.getProperties().get(property)));
                    if (schema.getRequired().isEmpty()) {
                        schema.setRequired(null);
                    }
                }
            }
        };
    }

    @SuppressWarnings({ "rawtypes", "unchecked" })
    private static void applyRecordNullability(Class<?> record, Schema model) {
        JsonInclude include = record.getAnnotation(JsonInclude.class);
        boolean omitsNulls = include != null && include.value() != JsonInclude.Include.ALWAYS;
        Map<String, Schema> properties = model.getProperties();
        List<String> required = new ArrayList<>();
        for (RecordComponent component : record.getRecordComponents()) {
            Schema property = properties.get(component.getName());
            if (property == null) {
                continue;
            }
            boolean nullable = isNullable(component);
            if (!nullable || !omitsNulls) {
                required.add(component.getName());
            }
            if (nullable && !omitsNulls) {
                properties.put(component.getName(), nullable(property));
            } else if (property.getTypes() != null) {
                // swagger-core already reads @Nullable; omitted nulls are never sent.
                property.getTypes().remove("null");
            }
        }
        model.setRequired(required.isEmpty() ? null : required);
    }

    private static boolean isNullable(RecordComponent component) {
        return component.isAnnotationPresent(Nullable.class)
                || component.getAccessor().isAnnotationPresent(Nullable.class);
    }

    /** OpenAPI 3.1 spells nullability as a {@code null} type; a reference needs a union. */
    @SuppressWarnings("rawtypes")
    private static Schema nullable(Schema property) {
        if (property.get$ref() != null) {
            return new JsonSchema().oneOf(List.of(new JsonSchema().$ref(property.get$ref()), nullType()));
        }
        Set<String> types = property.getTypes();
        if (types != null && types.stream().allMatch("null"::equals)) {
            // swagger-core types a nullable untyped value (Object, JsonNode) as only null; {} admits both.
            property.setTypes(null);
        } else if (types != null) {
            property.addType("null");
        }
        return property;
    }

    private static Schema<?> nullType() {
        return new JsonSchema().types(new LinkedHashSet<>(List.of("null")));
    }

    @SuppressWarnings("rawtypes")
    private static boolean isNullable(Schema property) {
        if (property == null) {
            return false;
        }
        if (property.getTypes() != null && property.getTypes().contains("null")) {
            return true;
        }
        List<Schema> union = property.getOneOf();
        return union != null && union.stream().anyMatch(OpenApiContractConventions::isNullable);
    }

    private static Stream<Operation> operations(OpenAPI openApi) {
        return openApi.getPaths().values().stream().flatMap(path -> path.readOperations().stream());
    }

    @SuppressWarnings("rawtypes")
    private static Set<String> reachable(Map<String, Schema> schemas, Stream<Content> contents) {
        Set<String> found = new HashSet<>();
        contents.filter(content -> content != null)
                .flatMap(content -> content.values().stream())
                .forEach(media -> collect(media.getSchema(), schemas, found));
        return found;
    }

    @SuppressWarnings({ "rawtypes", "unchecked" })
    private static void collect(Schema schema, Map<String, Schema> schemas, Set<String> found) {
        if (schema == null) {
            return;
        }
        if (schema.get$ref() != null) {
            String name = schema.get$ref().substring(REF_PREFIX.length());
            if (found.add(name)) {
                collect(schemas.get(name), schemas, found);
            }
            return;
        }
        collect(schema.getItems(), schemas, found);
        if (schema.getAdditionalProperties() instanceof Schema additional) {
            collect(additional, schemas, found);
        }
        Stream.of(schema.getProperties() == null ? null : schema.getProperties().values(), schema.getOneOf())
                .filter(children -> children != null)
                .flatMap(children -> ((Collection<Schema>) children).stream())
                .forEach(child -> collect(child, schemas, found));
    }
}
