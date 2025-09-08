package dev.ulloasp.mlsuite.analyzer.services;

import java.util.List;

import dev.ulloasp.mlsuite.analyzer.entities.Signature;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;

public interface SignatureService {

    public Signature createSignature(OAuthProvider oauthProvider, String oauthId, Long modelId, String inputSignature);

    public Signature updateSignature(OAuthProvider oauthProvider, String oauthId, Long signatureId, String inputSignature, String outputSignature);

    public Signature getSignature(OAuthProvider oauthProvider, String oauthId, Long signatureId);

    public List<Signature> getSignatureByModelId(OAuthProvider oauthProvider, String oauthId, Long modelId);

    public void deleteSignature(OAuthProvider oauthProvider, String oauthId, Long signatureId);
}
