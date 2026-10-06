package dev.ulloasp.mlsuite.openapi;

import static org.junit.jupiter.api.Assertions.fail;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.springdoc.core.configuration.SpringDocConfiguration;
import org.springdoc.core.configuration.SpringDocSpecPropertiesConfiguration;
import org.springdoc.core.properties.SpringDocConfigProperties;
import org.springdoc.webmvc.core.configuration.SpringDocWebMvcConfiguration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.core.util.DefaultIndenter;
import com.fasterxml.jackson.core.util.DefaultPrettyPrinter;
import com.fasterxml.jackson.core.util.Separators;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;

import dev.ulloasp.mlsuite.admin.AdminUserService;
import dev.ulloasp.mlsuite.admin.infrastructure.InfrastructureService;
import dev.ulloasp.mlsuite.admin.moderation.PublicBookmarkModerationService;
import dev.ulloasp.mlsuite.audit.application.port.in.AuditLogUseCase;
import dev.ulloasp.mlsuite.invitation.application.port.in.InvitationManagementUseCase;
import dev.ulloasp.mlsuite.model.application.port.in.AnalyzerUseCase;
import dev.ulloasp.mlsuite.model.application.port.in.ModelCatalogUseCase;
import dev.ulloasp.mlsuite.model.application.port.in.ModelCreationUseCase;
import dev.ulloasp.mlsuite.organization.application.port.in.OrganizationManagementUseCase;
import dev.ulloasp.mlsuite.organization.application.usecase.OrganizationCatalogService;
import dev.ulloasp.mlsuite.plugin.application.port.in.ListPluginRuntimeSourcesUseCase;
import dev.ulloasp.mlsuite.plugin.application.port.in.PluginCatalogUseCase;
import dev.ulloasp.mlsuite.role.application.port.in.RoleCatalogUseCase;
import dev.ulloasp.mlsuite.role.application.port.in.RoleManagementUseCase;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultRepository;
import dev.ulloasp.mlsuite.schema.application.port.in.PredictBookmarkCatalogUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.PredictionResultFeedbackUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.PredictionRunUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.PublicBookmarkUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaBookmarkExampleUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaBookmarkUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaCatalogUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaCreationUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaDraftUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaVersionUseCase;
import dev.ulloasp.mlsuite.schema.review.application.port.in.SchemaReviewManagementUseCase;
import dev.ulloasp.mlsuite.schema.review.application.port.in.SchemaReviewUseCase;
import dev.ulloasp.mlsuite.search.application.port.in.SearchWorkspaceUseCase;
import dev.ulloasp.mlsuite.security.auth.AuthService;
import dev.ulloasp.mlsuite.startup.StartupReadinessService;
import dev.ulloasp.mlsuite.user.application.port.in.GetCurrentUserProfileUseCase;
import dev.ulloasp.mlsuite.workspace.application.port.in.WorkspaceContextUseCase;

/**
 * Keeps {@code api/openapi.json}, the source of the frontend's generated types, equal to what the
 * controllers publish. Controllers run against mocked collaborators; only their signatures matter.
 */
@WebMvcTest(properties = {
        "spring.profiles.active=test",
        "logging.file.name=target/openapi-contract-test.log",
        "server.port=0",
        "springdoc.default-produces-media-type=application/json",
        "springdoc.override-with-generic-response=false" })
@AutoConfigureMockMvc(addFilters = false)
@ImportAutoConfiguration({
        SpringDocConfiguration.class,
        SpringDocConfigProperties.class,
        SpringDocSpecPropertiesConfiguration.class,
        SpringDocWebMvcConfiguration.class })
@Import(OpenApiContractConventions.class)
@MockitoBean(types = {
        AdminUserService.class, AnalyzerUseCase.class, AuditLogUseCase.class, AuthService.class,
        AuthenticationManager.class, GetCurrentUserProfileUseCase.class, InfrastructureService.class,
        InvitationManagementUseCase.class, ListPluginRuntimeSourcesUseCase.class, ModelCatalogUseCase.class,
        ModelCreationUseCase.class, OrganizationCatalogService.class, OrganizationManagementUseCase.class,
        PluginCatalogUseCase.class, PredictBookmarkCatalogUseCase.class, PredictionResultFeedbackUseCase.class,
        PredictionResultRepository.class, PredictionRunUseCase.class, PublicBookmarkModerationService.class,
        PublicBookmarkUseCase.class, RoleCatalogUseCase.class,
        RoleManagementUseCase.class, SchemaBookmarkExampleUseCase.class, SchemaBookmarkUseCase.class,
        SchemaCatalogUseCase.class,
        SchemaCreationUseCase.class, SchemaDraftUseCase.class, SchemaReviewManagementUseCase.class,
        SchemaReviewUseCase.class, SchemaVersionUseCase.class, SearchWorkspaceUseCase.class,
        RestTemplate.class, StartupReadinessService.class, WorkspaceContextUseCase.class })
class OpenApiContractTest {

    private static final Path SPEC = Path.of("openapi.json");
    private static final String REGENERATE = """
            api/openapi.json does not match the controllers. Regenerate it and the frontend types:
              cd api && mvn test -Dtest=OpenApiContractTest -Dopenapi.update=true
              cd frontend && vp run api:types
            """;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void committedSpecMatchesControllers() throws Exception {
        String published = mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        String actual = canonical(published);

        if (Boolean.getBoolean("openapi.update")) {
            Files.writeString(SPEC, actual);
            return;
        }
        String committed = Files.exists(SPEC) ? Files.readString(SPEC).replace("\r\n", "\n") : "";
        if (!committed.equals(actual)) {
            fail(REGENERATE + firstDifference(committed, actual));
        }
    }

    /** Sorted keys, two-space indentation, and LF endings keep the committed file diff-friendly. */
    private static String canonical(String json) throws Exception {
        ObjectMapper mapper = new ObjectMapper().enable(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS);
        DefaultIndenter indenter = new DefaultIndenter("  ", "\n");
        DefaultPrettyPrinter printer = new DefaultPrettyPrinter()
                .withSeparators(Separators.createDefaultInstance()
                        .withObjectFieldValueSpacing(Separators.Spacing.AFTER));
        printer.indentObjectsWith(indenter);
        printer.indentArraysWith(indenter);
        return mapper.writer(printer).writeValueAsString(mapper.readValue(json, Object.class)) + "\n";
    }

    private static String firstDifference(String committed, String actual) {
        String[] expected = committed.split("\n", -1);
        String[] found = actual.split("\n", -1);
        for (int line = 0; line < Math.max(expected.length, found.length); line++) {
            String left = line < expected.length ? expected[line] : "<end of file>";
            String right = line < found.length ? found[line] : "<end of file>";
            if (!left.equals(right)) {
                return "First difference at line %d:%n  committed: %s%n  generated: %s"
                        .formatted(line + 1, left.strip(), right.strip());
            }
        }
        return "";
    }
}
