package dev.ulloasp.mlsuite.search;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.plugin.application.dto.PluginDto;
import dev.ulloasp.mlsuite.plugin.application.port.in.ListPluginsUseCase;
import dev.ulloasp.mlsuite.prediction.adapter.out.persistence.repository.PredictionRepository;
import dev.ulloasp.mlsuite.prediction.domain.model.Prediction;
import dev.ulloasp.mlsuite.prediction.domain.model.PredictionStatus;
import dev.ulloasp.mlsuite.search.application.dto.SearchResponseDto;
import dev.ulloasp.mlsuite.search.application.usecase.SearchWorkspaceService;
import dev.ulloasp.mlsuite.signature.adapter.out.persistence.repository.SignatureRepository;
import dev.ulloasp.mlsuite.signature.domain.model.Signature;
import dev.ulloasp.mlsuite.team.adapter.out.persistence.repository.TeamRepository;
import dev.ulloasp.mlsuite.team.domain.model.Team;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;

@ExtendWith(MockitoExtension.class)
class SearchWorkspaceServiceTest {

    @Mock
    private WorkspaceAccessService workspaceAccessService;
    @Mock
    private OrganizationMembershipRepository membershipRepository;
    @Mock
    private TeamRepository teamRepository;
    @Mock
    private ModelRepository modelRepository;
    @Mock
    private SignatureRepository signatureRepository;
    @Mock
    private PredictionRepository predictionRepository;
    @Mock
    private ListPluginsUseCase listPluginsUseCase;

    private SearchWorkspaceService service;

    @BeforeEach
    void setUp() {
        service = new SearchWorkspaceService(
                workspaceAccessService,
                membershipRepository,
                teamRepository,
                modelRepository,
                signatureRepository,
                predictionRepository,
                listPluginsUseCase);
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
        Signature signature = signature(model);
        Prediction prediction = prediction(signature);
        when(workspaceAccessService.requireCurrentOrganization(7L)).thenReturn(organization);
        when(membershipRepository.findActiveByUserId(7L)).thenReturn(List.of(membership(organization)));
        when(teamRepository.findByOrganizationIdOrderByNameAsc(41L)).thenReturn(List.of(team));
        when(modelRepository.findByOrganizationId(41L)).thenReturn(List.of(model));
        when(signatureRepository.findByModelId(11L)).thenReturn(List.of(signature));
        when(predictionRepository.findBySignatureId(12L)).thenReturn(List.of(prediction));
        when(listPluginsUseCase.list(7L)).thenReturn(List.of(new PluginDto(
                "plug-1", "acme-plugin.ts", "application/typescript", 10L, now(), now(), true, "acme source")));

        SearchResponseDto response = service.search(7L, "ac");

        assertEquals(6, response.groups().size());
        assertEquals("Organizations", response.groups().getFirst().label());
        assertTrue(response.groups().stream()
                .flatMap(group -> group.results().stream())
                .anyMatch(result -> result.href().contains("/models/11")));
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

    private Signature signature(Model model) {
        Signature signature = new Signature();
        signature.setId(12L);
        signature.setModel(model);
        signature.setName("Acme Signature");
        signature.setMajor(1);
        signature.setMinor(2);
        signature.setPatch(3);
        signature.setInputSignature(Map.of());
        signature.setUpdatedAt(now());
        return signature;
    }

    private Prediction prediction(Signature signature) {
        Prediction prediction = new Prediction();
        prediction.setId(13L);
        prediction.setSignature(signature);
        prediction.setName("Acme Prediction");
        prediction.setStatus(PredictionStatus.COMPLETED);
        prediction.setUpdatedAt(now());
        return prediction;
    }
}
