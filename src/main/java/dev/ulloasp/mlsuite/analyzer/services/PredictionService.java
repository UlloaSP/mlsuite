package dev.ulloasp.mlsuite.analyzer.services;

import java.util.List;

import dev.ulloasp.mlsuite.analyzer.entities.Prediction;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;

public interface PredictionService {

    public Prediction createPrediction(OAuthProvider oauthProvider, String oauthId, Long signatureId, Object prediction, Object data);

    public Prediction updatePrediction(OAuthProvider oauthProvider, String oauthId, Long predictionId, Object realValue);

    public Prediction getPrediction(OAuthProvider oauthProvider, String oauthId, Long predictionId);

    public List<Prediction> getPredictionsBySignatureId(OAuthProvider oauthProvider, String oauthId, Long signatureId);

    public void deletePrediction(OAuthProvider oauthProvider, String oauthId, Long predictionId);

}
