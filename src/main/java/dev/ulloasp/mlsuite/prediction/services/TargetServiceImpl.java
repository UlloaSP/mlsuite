package dev.ulloasp.mlsuite.prediction.services;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import dev.ulloasp.mlsuite.prediction.entities.Prediction;
import dev.ulloasp.mlsuite.prediction.entities.Target;
import dev.ulloasp.mlsuite.prediction.exceptions.PredictionDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.exceptions.TargetDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.repositories.PredictionRepository;
import dev.ulloasp.mlsuite.prediction.repositories.TargetRepository;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.exceptions.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.repository.UserRepository;

@Service
public class TargetServiceImpl implements TargetService {

    private final UserRepository userRepository;
    private final TargetRepository targetRepository;
    private final PredictionRepository predictionRepository;

    public TargetServiceImpl(UserRepository userRepository, TargetRepository targetRepository,
            PredictionRepository predictionRepository) {
        this.userRepository = userRepository;
        this.targetRepository = targetRepository;
        this.predictionRepository = predictionRepository;
    }

    @Override
    public Target createTarget(OAuthProvider oauthProvider, String oauthId, Long predictionId, int order,
            Object value) {

        Optional<User> optionalUser = userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId);

        if (optionalUser.isEmpty()) {
            throw new UserDoesNotExistException(oauthProvider.toString(), oauthId);
        }

        User user = optionalUser.get();

        Optional<Prediction> optionalPrediction = predictionRepository.findByIdAndUserId(predictionId, user.getId());

        if (optionalPrediction.isEmpty()) {
            throw new PredictionDoesNotExistsException(predictionId, user.getUsername());
        }

        Prediction prediction = optionalPrediction.get();

        Target target = new Target(prediction, order, value);

        return this.targetRepository.save(target);
    }

    @Override
    public Target updateTarget(OAuthProvider oauthProvider, String oauthId, Long targetId, Object real_value) {
        Optional<User> optionalUser = userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId);

        if (optionalUser.isEmpty()) {
            throw new UserDoesNotExistException(oauthProvider.toString(), oauthId);
        }

        User user = optionalUser.get();

        Optional<Target> optionalTarget = targetRepository.findByIdAndUserId(targetId, user.getId());

        if (optionalTarget.isEmpty()) {
            throw new TargetDoesNotExistsException(targetId, user.getUsername());
        }

        Target target = optionalTarget.get();
        target.setRealValue(real_value);

        return targetRepository.save(target);
    }

    @Override
    public List<Target> getTargetsByPredictionId(OAuthProvider oauthProvider, String oauthId, Long predictionId) {
        Optional<User> optionalUser = userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId);

        if (optionalUser.isEmpty()) {
            throw new UserDoesNotExistException(oauthProvider.toString(), oauthId);
        }
        User user = optionalUser.get();

        Optional<Prediction> optionalPrediction = predictionRepository.findByIdAndUserId(predictionId, user.getId());

        if (optionalPrediction.isEmpty()) {
            throw new PredictionDoesNotExistsException(predictionId, user.getUsername());
        }

        Prediction prediction = optionalPrediction.get();

        return targetRepository.findByPredictionId(prediction.getId());
    }

}
