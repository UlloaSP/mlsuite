package dev.ulloasp.mlsuite.analyzer.services;

import java.util.List;

import dev.ulloasp.mlsuite.analyzer.entities.Model;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;

public interface ModelService {

    public Model createModel(OAuthProvider oauthProvider, String oauthId, String name, byte[] blob);

    public Model updateModel(OAuthProvider oauthProvider, String oauthId, Long modelId, String name);

    public Model getModel(OAuthProvider oauthProvider, String oauthId, Long modelId);

    public List<Model> getModelByUserId(OAuthProvider oauthProvider, String oauthId);

    public void deleteModel(OAuthProvider oauthProvider, String oauthId, Long modelId);
}
