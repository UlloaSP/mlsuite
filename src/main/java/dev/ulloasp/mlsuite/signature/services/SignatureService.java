package dev.ulloasp.mlsuite.signature.services;

import java.util.List;
import java.util.Map;

import dev.ulloasp.mlsuite.signature.entities.Signature;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;

public interface SignatureService {

        public Signature createSignature(OAuthProvider oauthProvider, String oauthId, Long modelId,
                        Map<String, Object> inputSignature, String name,
                        int major, int minor, int patch, Long origin);

        public Signature getSignature(OAuthProvider oauthProvider, String oauthId, Long signatureId);

        public List<Signature> getSignatureByModelId(OAuthProvider oauthProvider, String oauthId, Long modelId);
}
