package dev.ulloasp.mlsuite.signature;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import dev.ulloasp.mlsuite.plugin.application.dto.PluginDto;
import dev.ulloasp.mlsuite.plugin.application.port.in.PluginCatalogUseCase;
import dev.ulloasp.mlsuite.signature.domain.exception.InvalidSignatureSchemaException;
import dev.ulloasp.mlsuite.signature.application.service.SignatureSchemaCompatibilityServiceImpl;

@ExtendWith(MockitoExtension.class)
class SignatureSchemaCompatibilityServiceTest {

    @Mock
    private PluginCatalogUseCase pluginCatalogUseCase;

    private SignatureSchemaCompatibilityServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new SignatureSchemaCompatibilityServiceImpl(pluginCatalogUseCase);
    }

    @Test
    void validate_AllowsBuiltinKindsAndActiveCustomKinds() {
        when(pluginCatalogUseCase.listAll(7L)).thenReturn(List.of(
                plugin("field-kind", "export default defineFieldDefinition({ kind: \"field-kind\" });"),
                plugin("report-kind", "export default defineReportDefinition({ kind: \"report-kind\" });"),
                plugin("explanation-kind", "export default defineReportKind({ kind: \"explanation-kind\" });")));

        assertDoesNotThrow(() -> service.validate(7L, Map.of(
                "fields", List.of(Map.of("kind", "text"), Map.of("kind", "field-kind")),
                "reports", List.of(
                        Map.of("kind", "classifier"),
                        Map.of("kind", "report-kind"),
                        Map.of("kind", "explanation-kind")))));
    }

    @Test
    void validate_AllowsBuiltinKindsIntroducedByNewerMlformVersions() {
        when(pluginCatalogUseCase.listAll(7L)).thenReturn(List.of());

        assertDoesNotThrow(() -> service.validate(7L, Map.of(
                "fields", List.of(
                        Map.of("kind", "series"),
                        Map.of("kind", "long-text"),
                        Map.of("kind", "single-choice"),
                        Map.of("kind", "multi-choice"),
                        Map.of("kind", "rating"),
                        Map.of("kind", "mapped-category")))));
    }

    @Test
    void validate_ThrowsWhenExplanationReportKindMissing() {
        when(pluginCatalogUseCase.listAll(7L)).thenReturn(List.of());

        assertThrows(InvalidSignatureSchemaException.class, () -> service.validate(7L,
                Map.of("reports", List.of(Map.of("kind", "old-kind")))));
    }

    @Test
    void validate_AllowsExplanationReportKindWhenUploaded() {
        when(pluginCatalogUseCase.listAll(7L)).thenReturn(List.of(
                plugin("old-kind", "export default defineReportKind({ kind: \"old-kind\" });")));

        assertDoesNotThrow(() -> service.validate(7L,
                Map.of("reports", List.of(Map.of("kind", "old-kind")))));
    }

    @Test
    void validate_ThrowsWhenFieldKindMissing() {
        when(pluginCatalogUseCase.listAll(7L)).thenReturn(List.of());

        assertThrows(InvalidSignatureSchemaException.class, () -> service.validate(7L,
                Map.of("fields", List.of(Map.of("kind", "custom-field")))));
    }

    @Test
    void validate_AllowsReportKindWhenUploaded() {
        when(pluginCatalogUseCase.listAll(7L)).thenReturn(List.of(
                plugin("custom-report", "export default defineReportDefinition({ kind: \"custom-report\" });")));

        assertDoesNotThrow(() -> service.validate(7L,
                Map.of("reports", List.of(Map.of("kind", "custom-report")))));
    }

    private PluginDto plugin(String id, String source) {
        OffsetDateTime now = OffsetDateTime.now();
        return new PluginDto(id, id + ".ts", "application/typescript", source.length(), now, now, source, "report", id);
    }
}

