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
import dev.ulloasp.mlsuite.plugin.application.service.PluginService;
import dev.ulloasp.mlsuite.signature.domain.exception.InvalidSignatureSchemaException;
import dev.ulloasp.mlsuite.signature.application.service.SignatureSchemaCompatibilityServiceImpl;

@ExtendWith(MockitoExtension.class)
class SignatureSchemaCompatibilityServiceTest {

    @Mock
    private PluginService pluginService;

    private SignatureSchemaCompatibilityServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new SignatureSchemaCompatibilityServiceImpl(pluginService);
    }

    @Test
    void validate_AllowsBuiltinKindsAndActiveCustomKinds() {
        when(pluginService.list(7L)).thenReturn(List.of(
                plugin("field-kind", true, "export default defineFieldDefinition({ kind: \"field-kind\" });"),
                plugin("report-kind", true, "export default defineReportDefinition({ kind: \"report-kind\" });"),
                plugin("explanation-kind", true, "export default defineExplanationKind({ kind: \"explanation-kind\" });")));

        assertDoesNotThrow(() -> service.validate(7L, Map.of(
                "fields", List.of(Map.of("kind", "text"), Map.of("kind", "field-kind")),
                "reports", List.of(Map.of("kind", "classifier"), Map.of("kind", "report-kind")),
                "explanations", List.of(Map.of("kind", "explanation-kind")))));
    }

    @Test
    void validate_ThrowsWhenExplanationKindMissing() {
        when(pluginService.list(7L)).thenReturn(List.of());

        assertThrows(InvalidSignatureSchemaException.class, () -> service.validate(7L,
                Map.of("explanations", List.of(Map.of("kind", "old-kind")))));
    }

    @Test
    void validate_ThrowsWhenExplanationKindInactive() {
        when(pluginService.list(7L)).thenReturn(List.of(
                plugin("old-kind", false, "export default defineExplanationKind({ kind: \"old-kind\" });")));

        assertThrows(InvalidSignatureSchemaException.class, () -> service.validate(7L,
                Map.of("explanations", List.of(Map.of("kind", "old-kind")))));
    }

    @Test
    void validate_ThrowsWhenFieldKindMissing() {
        when(pluginService.list(7L)).thenReturn(List.of());

        assertThrows(InvalidSignatureSchemaException.class, () -> service.validate(7L,
                Map.of("fields", List.of(Map.of("kind", "custom-field")))));
    }

    @Test
    void validate_ThrowsWhenReportKindInactive() {
        when(pluginService.list(7L)).thenReturn(List.of(
                plugin("custom-report", false, "export default defineReportDefinition({ kind: \"custom-report\" });")));

        assertThrows(InvalidSignatureSchemaException.class, () -> service.validate(7L,
                Map.of("reports", List.of(Map.of("kind", "custom-report")))));
    }

    private PluginDto plugin(String id, boolean active, String source) {
        OffsetDateTime now = OffsetDateTime.now();
        return new PluginDto(id, id + ".ts", "application/typescript", source.length(), now, now, active, source);
    }
}

