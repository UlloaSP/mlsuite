package dev.ulloasp.mlsuite.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import org.junit.jupiter.api.Test;

import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;

class WebAdapterArchitectureTest {

    @Test
    void webAdaptersDependOnPortsNotServices() {
        var classes = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("dev.ulloasp.mlsuite");

        ArchRule rule = noClasses()
                .that().resideInAPackage("..adapter.in.web..")
                .should().dependOnClassesThat().resideInAPackage("..application.service..");

        rule.check(classes);
    }
}
