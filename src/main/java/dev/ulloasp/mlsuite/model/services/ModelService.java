package dev.ulloasp.mlsuite.model.services;

import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.entities.Model;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;

public interface ModelService {

    public Model createModel(OAuthProvider oauthProvider, String oauthId, String name, MultipartFile modelFile);

    public Model updateModel(OAuthProvider oauthProvider, String oauthId, Long modelId, String name);

    public Model getModel(OAuthProvider oauthProvider, String oauthId, Long modelId);

    public List<Model> getModelByUserId(OAuthProvider oauthProvider, String oauthId);

    public void deleteModel(OAuthProvider oauthProvider, String oauthId, Long modelId);
}
