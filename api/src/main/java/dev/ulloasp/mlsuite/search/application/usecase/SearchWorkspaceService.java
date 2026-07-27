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
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.plugin.adapter.out.persistence.repository.PluginMetadataRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaVersionRepository;
import dev.ulloasp.mlsuite.search.application.dto.SearchGroupDto;
import dev.ulloasp.mlsuite.search.application.dto.SearchResponseDto;
import dev.ulloasp.mlsuite.search.application.dto.SearchResultDto;
import dev.ulloasp.mlsuite.search.application.port.in.SearchWorkspaceUseCase;
import dev.ulloasp.mlsuite.search.application.service.SearchTextMatcher;
import dev.ulloasp.mlsuite.search.application.service.SearchTextMatcher.SearchTextQuery;
import dev.ulloasp.mlsuite.search.application.usecase.SearchWorkspaceCandidateFactory.SearchCandidate;
import dev.ulloasp.mlsuite.team.adapter.out.persistence.repository.TeamRepository;
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
    private final SchemaVersionRepository schemaVersionRepository;
    private final SchemaBookmarkRepository schemaBookmarkRepository;
    private final PredictionRunRepository predictionRunRepository;
    private final PluginMetadataRepository pluginMetadataRepository;
    public SearchWorkspaceService(
            WorkspaceAccessService workspaceAccessService,
            WorkspaceAuthorizationService workspaceAuthorizationService,
            OrganizationMembershipRepository membershipRepository,
            TeamRepository teamRepository,
            ModelRepository modelRepository,
            SchemaRepository schemaRepository,
            SchemaVersionRepository schemaVersionRepository,
            SchemaBookmarkRepository schemaBookmarkRepository,
            PredictionRunRepository predictionRunRepository,
            PluginMetadataRepository pluginMetadataRepository) {
        this.workspaceAccessService = workspaceAccessService;
        this.workspaceAuthorizationService = workspaceAuthorizationService;
        this.membershipRepository = membershipRepository;
        this.teamRepository = teamRepository;
        this.modelRepository = modelRepository;
        this.schemaRepository = schemaRepository;
        this.schemaVersionRepository = schemaVersionRepository;
        this.schemaBookmarkRepository = schemaBookmarkRepository;
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
                SearchWorkspaceCandidateFactory::fromOrganization));
        addGroup(groups, "Teams", rank(
                teamRepository.searchByOrganizationId(organization.getId(), prefilter, candidates),
                searchQuery,
                SearchWorkspaceCandidateFactory::fromTeam));
        addGroup(groups, "Models", rank(
                modelRepository.searchByOrganizationId(organization.getId(), prefilter, candidates),
                searchQuery,
                SearchWorkspaceCandidateFactory::fromModel));
        addGroup(groups, "Schemas", rank(
                schemaRepository.searchByOrganizationId(organization.getId(), prefilter, candidates),
                searchQuery,
                SearchWorkspaceCandidateFactory::fromSchema));
        addGroup(groups, "Snapshots", rank(
                schemaVersionRepository.searchByOrganizationId(organization.getId(), prefilter, candidates),
                searchQuery,
                SearchWorkspaceCandidateFactory::fromSnapshot));
        addGroup(groups, "Bookmarks", rank(
                schemaBookmarkRepository.searchByOrganizationId(organization.getId(), prefilter, candidates),
                searchQuery,
                SearchWorkspaceCandidateFactory::fromBookmark));
        addGroup(groups, "Prediction Runs", rank(
                predictionRunRepository.searchByOrganizationId(organization.getId(), prefilter, candidates),
                searchQuery,
                SearchWorkspaceCandidateFactory::fromPredictionRun));
        workspaceAuthorizationService.requirePluginView(userId, organization.getId());
        addGroup(groups, "Plugins", rank(
                pluginMetadataRepository.searchByOrganizationId(organization.getId(), prefilter, candidates),
                searchQuery,
                SearchWorkspaceCandidateFactory::fromPlugin));
        return new SearchResponseDto(searchQuery.raw(), groups);
    }
    private <T> List<RankedResult> rank(
            List<T> items,
            SearchTextQuery query,
            Function<T, SearchCandidate> candidateFactory) {
        return items.stream()
                .map(candidateFactory)
                .map(candidate -> toRanked(candidate, query))
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
    private RankedResult toRanked(SearchCandidate candidate, SearchTextQuery query) {
        int score = SearchTextMatcher.score(query, candidate.terms());
        return score < 0 ? null : new RankedResult(score, candidate.updatedAt(), candidate.result());
    }

    private record RankedResult(int rank, OffsetDateTime updatedAt, SearchResultDto result) {
    }
}
