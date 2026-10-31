package dev.ulloasp.mlsuite.audit;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.lang.annotation.Annotation;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.domain.JavaCodeUnit;
import com.tngtech.archunit.core.domain.JavaMethod;
import com.tngtech.archunit.core.domain.JavaMethodCall;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceBootstrapService;

/**
 * Keeps the audit log complete as the API grows: walking the compiled call graph from each
 * endpoint, every endpoint that changes something must reach AuditLogService, and none that only
 * reads may. A new mutating endpoint fails here until it records, or is named below with a reason.
 * What an entry says is covered by the tests of each feature.
 */
class AuditCoverageTest {

    /** Changes nothing anyone should audit, or reads through a POST for the size of its body. */
    private static final Set<String> NOT_ACTIONS = Set.of(
            "WorkspaceController.selectOrganization",
            "WorkspaceCatalogController.selectCurrentOrganization",
            "InferenceCatalogController.inferenceFacetCatalog",
            "InferenceCatalogController.page",
            "InferenceCatalogController.metadata",
            "InferenceCatalogController.selection",
            "CatalogSelectionController.page",
            "CatalogSelectionController.ids");

    /** Records for its own reason, on whichever call finds a member with no workspace. */
    private static final Set<String> NOT_FOLLOWED = Set.of(WorkspaceBootstrapService.class.getName());

    private static final JavaClasses CLASSES = new ClassFileImporter()
            .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
            .importPackages("dev.ulloasp.mlsuite");

    @Test
    void everyEndpointThatChangesSomethingRecordsIt() {
        List<String> silent = endpoints(PostMapping.class, PutMapping.class, PatchMapping.class, DeleteMapping.class)
                .filter(endpoint -> !NOT_ACTIONS.contains(name(endpoint)))
                .filter(endpoint -> !recordsAnAuditEntry(endpoint))
                .map(AuditCoverageTest::name).sorted().toList();

        assertEquals(List.of(), silent);
    }

    @Test
    void noEndpointThatReadsRecords() {
        List<String> noisy = endpoints(GetMapping.class).filter(AuditCoverageTest::recordsAnAuditEntry)
                .map(AuditCoverageTest::name).sorted().toList();

        assertEquals(List.of(), noisy);
    }

    @Test
    void theEndpointsLeftOutStillExistAndStillRecordNothing() {
        List<JavaMethod> mutating = endpoints(PostMapping.class, PutMapping.class, PatchMapping.class,
                DeleteMapping.class).toList();

        assertEquals(new HashSet<>(NOT_ACTIONS), mutating.stream().map(AuditCoverageTest::name)
                .filter(NOT_ACTIONS::contains).collect(Collectors.toSet()));
        assertEquals(List.of(), mutating.stream().filter(endpoint -> NOT_ACTIONS.contains(name(endpoint)))
                .filter(AuditCoverageTest::recordsAnAuditEntry).map(AuditCoverageTest::name).toList());
    }

    @Test
    void everyActionCodeIsRecordedSomewhere() {
        JavaClass action = CLASSES.get(AuditAction.class);
        List<String> unused = new ArrayList<>();
        for (AuditAction code : AuditAction.values()) {
            boolean used = action.getField(code.name()).getAccessesToSelf().stream()
                    .anyMatch(access -> !access.getOriginOwner().equals(action));
            if (!used) unused.add(code.name());
        }

        assertEquals(List.of(), unused);
    }

    @SafeVarargs
    private static Stream<JavaMethod> endpoints(Class<? extends Annotation>... mappings) {
        return CLASSES.stream().filter(type -> type.isAnnotatedWith(RestController.class))
                .flatMap(type -> type.getMethods().stream())
                .filter(method -> Stream.of(mappings).anyMatch(method::isAnnotatedWith));
    }

    private static String name(JavaMethod endpoint) {
        return endpoint.getOwner().getSimpleName() + "." + endpoint.getName();
    }

    private static boolean recordsAnAuditEntry(JavaMethod endpoint) {
        Deque<JavaCodeUnit> pending = new ArrayDeque<>(List.of(endpoint));
        Set<JavaCodeUnit> seen = new HashSet<>(pending);
        while (!pending.isEmpty()) {
            for (JavaMethodCall call : pending.poll().getMethodCallsFromSelf()) {
                if (call.getTargetOwner().isEquivalentTo(AuditLogService.class)) return true;
                if (!call.getTargetOwner().getPackageName().startsWith("dev.ulloasp.mlsuite")
                        || NOT_FOLLOWED.contains(call.getTargetOwner().getName())) continue;
                implementations(call).filter(seen::add).forEach(pending::add);
            }
        }
        return false;
    }

    /** What a call can run: the method it names and, through a port, whatever implements it. */
    private static Stream<JavaMethod> implementations(JavaMethodCall call) {
        return call.getTarget().resolveMember().stream().flatMap(method -> Stream.concat(Stream.of(method),
                method.getOwner().getAllSubclasses().stream().flatMap(type -> type.getMethods().stream())
                        .filter(candidate -> candidate.getName().equals(method.getName())
                                && candidate.getRawParameterTypes().equals(method.getRawParameterTypes()))));
    }
}
