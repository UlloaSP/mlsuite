package dev.ulloasp.mlsuite.signature.application.port.in;

import java.util.List;
import java.util.Map;

import dev.ulloasp.mlsuite.signature.domain.model.Signature;

public interface SignatureCatalogUseCase {

    Signature createSignature(
            Long userId,
            Long modelId,
            Map<String, Object> inputSignature,
            String name,
            int major,
            int minor,
            int patch,
            Long origin);

    Signature getSignature(Long userId, Long signatureId);

    List<Signature> getSignatureByModelId(Long userId, Long modelId);
}
