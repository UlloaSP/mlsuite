package dev.ulloasp.mlsuite.search.application.usecase;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.function.Function;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.plugin.adapter.out.persistence.repository.PluginMetadataRepository;
import dev.ulloasp.mlsuite.plugin.domain.model.PluginMetadata;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.search.application.dto.SearchGroupDto;
import dev.ulloasp.mlsuite.search.application.dto.SearchResponseDto;
import dev.ulloasp.mlsuite.search.application.dto.SearchResultDto;
import dev.ulloasp.mlsuite.search.application.port.in.SearchWorkspaceUseCase;
import dev.ulloasp.mlsuite.search.application.service.SearchTextMatcher;
import dev.ulloasp.mlsuite.search.application.service.SearchTextMatcher.SearchTextQuery;
import dev.ulloasp.mlsuite.team.adapter.out.persistence.repository.TeamRepository;
import dev.ulloasp.mlsuite.team.domain.model.Team;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@Service
public class SearchWorkspaceService implements SearchWorkspaceUseCase {

    private static final int MIN_QUERY_LENGTH = 2;
    private static final int MAX_PER_GROUP = 5;
    private static final int MAX_CANDIDATES = 25;

    private final WorkspaceAccessService workspaceAccessService;
    private final WorkspaceAuthorizationService workspaceAuthorizationService;
    private final OrganizationMembershipRepository membershipRepository;
    private final TeamRepository teamRepository;
    private final ModelRepository modelRepository;
    private final SchemaRepository schemaRepository;
    private final PredictionRunRepository predictionRunRepository;
    private final PluginMetadataRepository pluginMetadataRepository;

    public SearchWorkspaceService(
            WorkspaceAccessService workspaceAccessService,
            WorkspaceAuthorizationService workspaceAuthorizationService,
            OrganizationMembershipRepository membershipRepository,
            TeamRepository teamRepository,
            ModelRepository modelRepository,
            SchemaRepository schemaRepository,
            PredictionRunRepository predictionRunRepository,
            PluginMetadataRepository pluginMetadataRepository) {
        this.workspaceAccessService = workspaceAccessService;
        this.workspaceAuthorizationService = workspaceAuthorizationService;
        this.membershipRepository = membershipRepository;
        this.teamRepository = teamRepository;
        this.modelRepository = modelRepository;
        this.schemaRepository = schemaRepository;
        this.predictionRunRepository = predictionRunRepository;
        this.pluginMetadataRepository = pluginMetadataRepository;
    }

    @Override
    public SearchResponseDto search(Long userId, String query) {
        SearchTextQuery searchQuery = SearchTextMatcher.parse(query);
        if (searchQuery.tooShort(MIN_QUERY_LENGTH)) {
            return new SearchResponseDto(searchQuery.raw(), List.of());
        }

        String prefilter = searchQuery.prefilter();
        Organization organization = workspaceAccessService.requireCurrentOrganization(userId);
        Pageable candidates = PageRequest.of(0, MAX_CANDIDATES);

        List<SearchGroupDto> groups = new ArrayList<>();
        addGroup(groups, "Organizations", rank(
                membershipRepository.searchActiveByUserId(userId, prefilter, candidates)
                        .stream()
                        .map(OrganizationMembership::getOrganization)
                        .toList(),
                searchQuery,
                this::toOrganizationMatch));
        addGroup(groups, "Teams", rank(
                teamRepository.searchByOrganizationId(organization.getId(), prefilter, candidates),
                searchQuery,
                this::toTeamMatch));
        addGroup(groups, "Models", rank(
                modelRepository.searchByOrganizationId(organization.getId(), prefilter, candidates),
                searchQuery,
                this::toModelMatch));
        addGroup(groups, "Schemas", rank(
                schemaRepository.searchByOrganizationId(organization.getId(), prefilter, candidates),
                searchQuery,
                this::toSchemaMatch));
        addGroup(groups, "Prediction Runs", rank(
                predictionRunRepository.searchByOrganizationId(organization.getId(), prefilter, candidates),
                searchQuery,
                this::toPredictionRunMatch));
        workspaceAuthorizationService.requirePluginView(userId, organization.getId());
        addGroup(groups, "Plugins", rank(
                pluginMetadataRepository.searchByOrganizationId(organization.getId(), prefilter, candidates),
                searchQuery,
                this::toPluginMatch));
        return new SearchResponseDto(searchQuery.raw(), groups);
    }

    private <T> List<RankedResult> rank(
            List<T> items,
            SearchTextQuery query,
            Function<T, Candidate> candidateFactory) {
        return items.stream()
                .map(candidateFactory)
                .map(candidate -> candidate.toRanked(query))
                .filter(Objects::nonNull)
                .sorted(Comparator
                        .comparingInt(RankedResult::rank)
                        .thenComparing(RankedResult::updatedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(result -> result.result().title(), String.CASE_INSENSITIVE_ORDER))
                .limit(MAX_PER_GROUP)
                .toList();
    }

    private void addGroup(List<SearchGroupDto> groups, String label, List<RankedResult> rankedResults) {
        if (rankedResults.isEmpty()) {
            return;
        }
        groups.add(new SearchGroupDto(label, rankedResults.stream().map(RankedResult::result).toList()));
    }

    private Candidate toOrganizationMatch(Organization organization) {
        return new Candidate(
                new SearchResultDto(
                        "organization",
                        String.valueOf(organization.getId()),
                        organization.getName(),
                        organization.getSlug(),
                        "/workspace/organizations/" + organization.getId(),
                        organization.getId(),
                        null,
                        null),
                organization.getUpdatedAt(),
                organization.getName(),
                organization.getSlug());
    }

    private Candidate toTeamMatch(Team team) {
        return new Candidate(
                new SearchResultDto(
                        "team",
                        String.valueOf(team.getId()),
                        team.getName(),
                        team.getSlug(),
                        "/workspace/teams/" + team.getId(),
                        team.getOrganization().getId(),
                        team.getId(),
                        null),
                team.getUpdatedAt(),
                team.getName(),
                team.getSlug(),
                team.getDescription());
    }

    private Candidate toModelMatch(Model model) {
        return new Candidate(
                new SearchResultDto(
                        "model",
                        String.valueOf(model.getId()),
                        model.getName(),
                        model.getType() + " / " + model.getSpecificType(),
                        "/models/" + model.getId(),
                        model.getOrganization() == null ? null : model.getOrganization().getId(),
                        model.getTeam() == null ? null : model.getTeam().getId(),
                        model.getId()),
                model.getUpdatedAt(),
                model.getName(),
                model.getType(),
                model.getSpecificType(),
                model.getFileName());
    }

    private Candidate toSchemaMatch(Schema schema) {
        return new Candidate(
                new SearchResultDto(
                        "schema",
                        String.valueOf(schema.getId()),
                        schema.getName(),
                        schema.getDescription(),
                        "/schemas/" + schema.getId(),
                        schema.getOrganization().getId(),
                        null,
                        null),
                schema.getUpdatedAt(),
                schema.getName(),
                schema.getDescription());
    }

    private Candidate toPredictionRunMatch(PredictionRun run) {
        Schema schema = run.getSchemaVersion().getSchema();
        return new Candidate(
                new SearchResultDto(
                        "predictionRun",
                        String.valueOf(run.getId()),
                        run.getName(),
                        schema.getName() + " / " + run.getStatus(),
                        "/schemas/" + schema.getId()
                                + "/versions/" + run.getSchemaVersion().getId()
                                + "/runs/" + run.getId(),
                        schema.getOrganization().getId(),
                        null,
                        null),
                run.getUpdatedAt(),
                run.getName(),
                schema.getName());
    }

    private Candidate toPluginMatch(PluginMetadata plugin) {
        return new Candidate(
                new SearchResultDto(
                        "plugin",
                        plugin.getId(),
                        plugin.getFileName(),
                        plugin.getKind() == null ? "Plugin" : plugin.getKind(),
                        "/plugins",
                        plugin.getOrganization().getId(),
                        null,
                        null),
                plugin.getUpdatedAt(),
                plugin.getFileName(),
                plugin.getPluginType(),
                plugin.getKind());
    }

    private record Candidate(SearchResultDto result, OffsetDateTime updatedAt, String... terms) {
        private RankedResult toRanked(SearchTextQuery query) {
            int score = SearchTextMatcher.score(query, terms);
            return score < 0 ? null : new RankedResult(score, updatedAt, result);
        }
    }

    private record RankedResult(int rank, OffsetDateTime updatedAt, SearchResultDto result) {
    }
}
