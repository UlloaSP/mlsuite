package dev.ulloasp.mlsuite.prediction.services;

import java.util.List;

import dev.ulloasp.mlsuite.prediction.entities.Target;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;

public interface TargetService {

    Target createTarget(OAuthProvider oauthProvider, String oauthId, Long predictionId, int order, Object value);

    Target updateTarget(OAuthProvider oauthProvider, String oauthId, Long targetId, Object real_value);

    List<Target> getTargetsByPredictionId(OAuthProvider oauthProvider, String oauthId, Long predictionId);

}
