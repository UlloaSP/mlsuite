package dev.ulloasp.mlsuite.search;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.data.domain.Pageable;

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.plugin.adapter.out.persistence.repository.PluginMetadataRepository;
import dev.ulloasp.mlsuite.plugin.domain.model.PluginMetadata;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunStatus;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.search.application.dto.SearchResponseDto;
import dev.ulloasp.mlsuite.search.application.usecase.SearchWorkspaceService;
import dev.ulloasp.mlsuite.team.adapter.out.persistence.repository.TeamRepository;
import dev.ulloasp.mlsuite.team.domain.model.Team;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@ExtendWith(MockitoExtension.class)
class SearchWorkspaceServiceTest {

    @Mock
    private WorkspaceAccessService workspaceAccessService;
    @Mock
    private WorkspaceAuthorizationService workspaceAuthorizationService;
    @Mock
    private OrganizationMembershipRepository membershipRepository;
    @Mock
    private TeamRepository teamRepository;
    @Mock
    private ModelRepository modelRepository;
    @Mock
    private SchemaRepository schemaRepository;
    @Mock
    private PredictionRunRepository predictionRunRepository;
    @Mock
    private PluginMetadataRepository pluginMetadataRepository;

    private SearchWorkspaceService service;

    @BeforeEach
    void setUp() {
        service = new SearchWorkspaceService(
                workspaceAccessService,
                workspaceAuthorizationService,
                membershipRepository,
                teamRepository,
                modelRepository,
                schemaRepository,
                predictionRunRepository,
                pluginMetadataRepository);
    }

    @Test
    void search_ReturnsEmptyGroupsForShortQuery() {
        SearchResponseDto response = service.search(7L, "a");
        assertTrue(response.groups().isEmpty());
    }

    @Test
    void search_ReturnsScopedGroupedResults() {
        Organization organization = organization();
        Team team = team(organization);
        Model model = model(organization, team);
        Schema schema = schema(organization);
        PredictionRun run = run(schema);
        when(workspaceAccessService.requireCurrentOrganization(7L)).thenReturn(organization);
        when(membershipRepository.searchActiveByUserId(eq(7L), eq("ac"), any(Pageable.class)))
                .thenReturn(List.of(membership(organization)));
        when(teamRepository.searchByOrganizationId(eq(41L), eq("ac"), any(Pageable.class))).thenReturn(List.of(team));
        when(modelRepository.searchByOrganizationId(eq(41L), eq("ac"), any(Pageable.class))).thenReturn(List.of(model));
        when(schemaRepository.searchByOrganizationId(eq(41L), eq("ac"), any(Pageable.class))).thenReturn(List.of(schema));
        when(predictionRunRepository.searchByOrganizationId(eq(41L), eq("ac"), any(Pageable.class))).thenReturn(List.of(run));
        when(pluginMetadataRepository.searchByOrganizationId(eq(41L), eq("ac"), any(Pageable.class))).thenReturn(List.of(new PluginMetadata(
                "plug-1",
                organization,
                "organizations/41/plugins/items/plug-1.json",
                "acme-plugin.ts",
                "application/typescript",
                10L,
                now(),
                now(),
                null,
                "report",
                "acme-plugin")));

        SearchResponseDto response = service.search(7L, "ac");

        assertEquals(6, response.groups().size());
        assertEquals("Organizations", response.groups().getFirst().label());
        assertTrue(response.groups().stream()
                .flatMap(group -> group.results().stream())
                .anyMatch(result -> result.href().contains("/models/11")));
        assertTrue(response.groups().stream()
                .flatMap(group -> group.results().stream())
                .anyMatch(result -> "schema".equals(result.type())));
        assertTrue(response.groups().stream()
                .flatMap(group -> group.results().stream())
                .anyMatch(result -> "predictionRun".equals(result.type())));
    }

    @Test
    void search_MatchesTokensSeparatedByCamelCase() {
        Organization organization = organization();
        Model model = model(organization, team(organization));
        model.setName("RandomForestClassifier");
        stubSearches(
                "random",
                organization,
                List.of(),
                List.of(),
                List.of(model),
                List.of(),
                List.of(),
                List.of());

        SearchResponseDto response = service.search(7L, "random forest");

        assertEquals(1, response.groups().size());
        assertEquals("Models", response.groups().getFirst().label());
        assertEquals("RandomForestClassifier", response.groups().getFirst().results().getFirst().title());
    }

    @Test
    void search_FiltersCandidatesMissingAQueryToken() {
        Organization organization = organization();
        Schema schema = schema(organization);
        schema.setName("Random Scores");
        schema.setDescription("Quality dashboard");
        stubSearches(
                "random",
                organization,
                List.of(),
                List.of(),
                List.of(),
                List.of(schema),
                List.of(),
                List.of());

        SearchResponseDto response = service.search(7L, "random schema");

        assertTrue(response.groups().isEmpty());
    }

    @Test
    void search_MatchesTokensAcrossPluginFields() {
        Organization organization = organization();
        PluginMetadata plugin = plugin(organization, "audit-tool.zip", "Schema Report");
        stubSearches(
                "schema",
                organization,
                List.of(),
                List.of(),
                List.of(),
                List.of(),
                List.of(),
                List.of(plugin));

        SearchResponseDto response = service.search(7L, "schema audit");

        assertEquals(1, response.groups().size());
        assertEquals("Plugins", response.groups().getFirst().label());
        assertEquals("audit-tool.zip", response.groups().getFirst().results().getFirst().title());
    }

    private void stubSearches(
            String prefilter,
            Organization organization,
            List<OrganizationMembership> memberships,
            List<Team> teams,
            List<Model> models,
            List<Schema> schemas,
            List<PredictionRun> runs,
            List<PluginMetadata> plugins) {
        when(workspaceAccessService.requireCurrentOrganization(7L)).thenReturn(organization);
        when(membershipRepository.searchActiveByUserId(eq(7L), eq(prefilter), any(Pageable.class)))
                .thenReturn(memberships);
        when(teamRepository.searchByOrganizationId(eq(41L), eq(prefilter), any(Pageable.class))).thenReturn(teams);
        when(modelRepository.searchByOrganizationId(eq(41L), eq(prefilter), any(Pageable.class))).thenReturn(models);
        when(schemaRepository.searchByOrganizationId(eq(41L), eq(prefilter), any(Pageable.class))).thenReturn(schemas);
        when(predictionRunRepository.searchByOrganizationId(eq(41L), eq(prefilter), any(Pageable.class))).thenReturn(runs);
        when(pluginMetadataRepository.searchByOrganizationId(eq(41L), eq(prefilter), any(Pageable.class))).thenReturn(plugins);
    }

    private OffsetDateTime now() {
        return OffsetDateTime.parse("2026-04-28T12:00:00Z");
    }

    private User user() {
        User user = new User();
        user.setId(7L);
        user.setUsername("alice");
        return user;
    }

    private Organization organization() {
        Organization organization = new Organization();
        organization.setId(41L);
        organization.setSlug("acme");
        organization.setName("Acme Corp");
        organization.setCreatedBy(user());
        organization.setUpdatedAt(now());
        return organization;
    }

    private OrganizationMembership membership(Organization organization) {
        OrganizationMembership membership = new OrganizationMembership();
        membership.setOrganization(organization);
        membership.setUser(user());
        membership.setRole(OrganizationRole.OWNER);
        membership.setStatus(MembershipStatus.ACTIVE);
        return membership;
    }

    private Team team(Organization organization) {
        Team team = new Team();
        team.setId(21L);
        team.setOrganization(organization);
        team.setSlug("acme-data");
        team.setName("Acme Data");
        team.setUpdatedAt(now());
        return team;
    }

    private Model model(Organization organization, Team team) {
        Model model = new Model();
        model.setId(11L);
        model.setOrganization(organization);
        model.setTeam(team);
        model.setName("Acme Model");
        model.setType("clf");
        model.setSpecificType("rf");
        model.setFileName("acme.pkl");
        model.setUpdatedAt(now());
        return model;
    }

    private Schema schema(Organization organization) {
        Schema schema = new Schema(organization, "Acme Schema", "Acme records");
        schema.setId(31L);
        schema.setUpdatedAt(now());
        return schema;
    }

    private PredictionRun run(Schema schema) {
        SchemaVersion version = new SchemaVersion();
        version.setId(51L);
        version.setSchema(schema);
        PredictionRun run = new PredictionRun();
        run.setId(61L);
        run.setName("Acme Run");
        run.setSchemaVersion(version);
        run.setStatus(PredictionRunStatus.SUCCESS);
        run.setUpdatedAt(now());
        return run;
    }

    private PluginMetadata plugin(Organization organization, String fileName, String kind) {
        return new PluginMetadata(
                "plug-1",
                organization,
                "organizations/41/plugins/items/plug-1.json",
                fileName,
                "application/zip",
                10L,
                now(),
                now(),
                null,
                kind,
                "custom-report");
    }

}
