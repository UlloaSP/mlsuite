package dev.ulloasp.mlsuite.search.application.usecase;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Stream;

import org.springframework.stereotype.Service;

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.plugin.application.dto.PluginDto;
import dev.ulloasp.mlsuite.plugin.application.port.in.PluginCatalogUseCase;
import dev.ulloasp.mlsuite.search.application.dto.SearchGroupDto;
import dev.ulloasp.mlsuite.search.application.dto.SearchResponseDto;
import dev.ulloasp.mlsuite.search.application.dto.SearchResultDto;
import dev.ulloasp.mlsuite.search.application.port.in.SearchWorkspaceUseCase;
import dev.ulloasp.mlsuite.team.adapter.out.persistence.repository.TeamRepository;
import dev.ulloasp.mlsuite.team.domain.model.Team;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;

@Service
public class SearchWorkspaceService implements SearchWorkspaceUseCase {

    private static final int MIN_QUERY_LENGTH = 2;
    private static final int MAX_PER_GROUP = 5;

    private final WorkspaceAccessService workspaceAccessService;
    private final OrganizationMembershipRepository membershipRepository;
    private final TeamRepository teamRepository;
    private final ModelRepository modelRepository;
    private final PluginCatalogUseCase pluginCatalogUseCase;

    public SearchWorkspaceService(
            WorkspaceAccessService workspaceAccessService,
            OrganizationMembershipRepository membershipRepository,
            TeamRepository teamRepository,
            ModelRepository modelRepository,
            PluginCatalogUseCase pluginCatalogUseCase) {
        this.workspaceAccessService = workspaceAccessService;
        this.membershipRepository = membershipRepository;
        this.teamRepository = teamRepository;
        this.modelRepository = modelRepository;
        this.pluginCatalogUseCase = pluginCatalogUseCase;
    }

    @Override
    public SearchResponseDto search(Long userId, String query) {
        String normalizedQuery = query == null ? "" : query.trim();
        if (normalizedQuery.length() < MIN_QUERY_LENGTH) {
            return new SearchResponseDto(normalizedQuery, List.of());
        }

        String needle = normalizedQuery.toLowerCase(Locale.ROOT);
        Organization organization = workspaceAccessService.requireCurrentOrganization(userId);
        List<Model> models = modelRepository.findByOrganizationId(organization.getId());

        List<SearchGroupDto> groups = new ArrayList<>();
        addGroup(groups, "Organizations", matchOrganizations(userId, needle));
        addGroup(groups, "Teams", rank(teamRepository.findByOrganizationIdOrderByNameAsc(organization.getId()), needle, this::toTeamMatch));
        addGroup(groups, "Models", rank(models, needle, this::toModelMatch));
        addGroup(groups, "Plugins", rank(pluginCatalogUseCase.listAll(userId), needle, this::toPluginMatch));
        return new SearchResponseDto(normalizedQuery, groups);
    }

    private List<RankedResult> matchOrganizations(Long userId, String needle) {
        return rank(
                membershipRepository.findActiveByUserId(userId).stream().map(OrganizationMembership::getOrganization).toList(),
                needle,
                this::toOrganizationMatch);
    }

    private <T> List<RankedResult> rank(
            List<T> items,
            String needle,
            Function<T, Candidate> candidateFactory) {
        return items.stream()
                .map(candidateFactory)
                .map(candidate -> candidate.toRanked(needle))
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

    private Candidate toPluginMatch(PluginDto plugin) {
        return new Candidate(
                new SearchResultDto(
                        "plugin",
                        plugin.id(),
                        plugin.fileName(),
                        "Plugin",
                        "/plugins",
                        null,
                        null,
                        null),
                plugin.updatedAt(),
                plugin.fileName(),
                plugin.source());
    }

    private record Candidate(SearchResultDto result, OffsetDateTime updatedAt, String... terms) {
        private RankedResult toRanked(String needle) {
            return Stream.of(terms)
                    .filter(Objects::nonNull)
                    .map(term -> score(term, needle))
                    .filter(score -> score >= 0)
                    .min(Integer::compareTo)
                    .map(score -> new RankedResult(score, updatedAt, result))
                    .orElse(null);
        }

        private int score(String term, String needle) {
            String normalized = term.toLowerCase(Locale.ROOT);
            if (normalized.startsWith(needle)) {
                return 0;
            }
            return normalized.contains(needle) ? 1 : -1;
        }
    }

    private record RankedResult(int rank, OffsetDateTime updatedAt, SearchResultDto result) {
    }
}
