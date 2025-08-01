package dev.ulloasp.mlsuite.analyzer.services;

import java.util.List;
import java.util.Optional;

import dev.ulloasp.mlsuite.analyzer.entities.Prediction;
import dev.ulloasp.mlsuite.analyzer.entities.Signature;
import dev.ulloasp.mlsuite.analyzer.exceptions.PredictionDoesNotExistsException;
import dev.ulloasp.mlsuite.analyzer.exceptions.SignatureDoesNotExistsException;
import dev.ulloasp.mlsuite.analyzer.repository.PredictionRepository;
import dev.ulloasp.mlsuite.analyzer.repository.SignatureRepository;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.exceptions.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.repository.UserRepository;

public class PredictionServiceImpl implements PredictionService {

    private final UserRepository userRepository;
    private final SignatureRepository signatureRepository;
    private final PredictionRepository predictionRepository;

    public PredictionServiceImpl(UserRepository userRepository, SignatureRepository signatureRepository,
            PredictionRepository predictionRepository) {
        this.userRepository = userRepository;
        this.signatureRepository = signatureRepository;
        this.predictionRepository = predictionRepository;
    }

    @Override
    public Prediction createPrediction(OAuthProvider oauthProvider, String oauthId, Long signatureId, Object prediction,
            Object data) {
        Optional<User> optionalUser = userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId);

        if (optionalUser.isEmpty()) {
            throw new UserDoesNotExistException(oauthProvider.toString(), oauthId);
        }

        User user = optionalUser.get();

        Optional<Signature> optionalSignature = signatureRepository.findByIdAndUserId(signatureId, user.getId());

        if (optionalSignature.isEmpty()) {
            throw new SignatureDoesNotExistsException(signatureId);
        }

        Signature signature = optionalSignature.get();

        Prediction pred = new Prediction(signature, data, prediction);

        return predictionRepository.save(pred);

    }

    @Override
    public Prediction updatePrediction(OAuthProvider oauthProvider, String oauthId, Long predictionId,
            Object realValue) {
        Optional<User> optionalUser = userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId);

        if (optionalUser.isEmpty()) {
            throw new UserDoesNotExistException(oauthProvider.toString(), oauthId);
        }

        User user = optionalUser.get();

        Optional<Prediction> optionalPrediction = predictionRepository.findByIdAndUserId(predictionId, user.getId());

        if (optionalPrediction.isEmpty()) {
            throw new PredictionDoesNotExistsException(predictionId, user.getDisplayName());
        }

        Prediction prediction = optionalPrediction.get();
        prediction.setRealValue(realValue);

        return predictionRepository.save(prediction);
    }

    @Override
    public Prediction getPrediction(OAuthProvider oauthProvider, String oauthId, Long predictionId) {
        Optional<User> optionalUser = userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId);

        if (optionalUser.isEmpty()) {
            throw new UserDoesNotExistException(oauthProvider.toString(), oauthId);
        }

        User user = optionalUser.get();

        Optional<Prediction> optionalPrediction = predictionRepository.findByIdAndUserId(predictionId, user.getId());

        if (optionalPrediction.isEmpty()) {
            throw new PredictionDoesNotExistsException(predictionId, user.getDisplayName());
        }

        return optionalPrediction.get();
    }

    @Override
    public List<Prediction> getPredictionsBySignatureId(OAuthProvider oauthProvider, String oauthId, Long signatureId) {
        Optional<User> optionalUser = userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId);

        if (optionalUser.isEmpty()) {
            throw new UserDoesNotExistException(oauthProvider.toString(), oauthId);
        }

        User user = optionalUser.get();

        Optional<Signature> optionalSignature = signatureRepository.findByIdAndUserId(signatureId, user.getId());

        if (optionalSignature.isEmpty()) {
            throw new SignatureDoesNotExistsException(signatureId);
        }

        Signature signature = optionalSignature.get();

        return predictionRepository.findBySignatureId(signature.getId());
    }

    @Override
    public void deletePrediction(OAuthProvider oauthProvider, String oauthId, Long predictionId) {
        Optional<User> optionalUser = userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId);

        if (optionalUser.isEmpty()) {
            throw new UserDoesNotExistException(oauthProvider.toString(), oauthId);
        }

        User user = optionalUser.get();

        Optional<Prediction> optionalPrediction = predictionRepository.findByIdAndUserId(predictionId, user.getId());

        if (optionalPrediction.isEmpty()) {
            throw new PredictionDoesNotExistsException(predictionId, user.getDisplayName());
        }

        predictionRepository.delete(optionalPrediction.get());
    }

}
