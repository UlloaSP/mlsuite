package dev.ulloasp.mlsuite.prediction.services;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;

import dev.ulloasp.mlsuite.prediction.entities.Prediction;
import dev.ulloasp.mlsuite.prediction.entities.PredictionStatus;
import dev.ulloasp.mlsuite.prediction.exceptions.PredictionDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.repositories.PredictionRepository;
import dev.ulloasp.mlsuite.signature.entities.Signature;
import dev.ulloasp.mlsuite.signature.exceptions.SignatureDoesNotExistsException;
import dev.ulloasp.mlsuite.signature.repositories.SignatureRepository;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.exceptions.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.repository.UserRepository;
import jakarta.transaction.Transactional;

@Service
@Transactional
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
    public Prediction createPrediction(OAuthProvider oauthProvider, String oauthId, Long signatureId, String name,
            Map<String, Object> prediction, Map<String, Object> data) {
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

        Prediction pred = new Prediction(signature, name, data, prediction);

        return predictionRepository.save(pred);

    }

    @Override
    public Prediction updatePrediction(OAuthProvider oauthProvider, String oauthId, Long predictionId,
            PredictionStatus status) {
        Optional<User> optionalUser = userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId);

        if (optionalUser.isEmpty()) {
            throw new UserDoesNotExistException(oauthProvider.toString(), oauthId);
        }

        User user = optionalUser.get();

        Optional<Prediction> optionalPrediction = predictionRepository.findById(predictionId);

        if (optionalPrediction.isEmpty()) {
            throw new PredictionDoesNotExistsException(predictionId, user.getUsername());
        }

        Prediction prediction = optionalPrediction.get();
        prediction.setStatus(status);

        return predictionRepository.save(prediction);
    }

    @Override
    public Prediction getPrediction(OAuthProvider oauthProvider, String oauthId, Long predictionId) {
        Optional<User> optionalUser = userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId);

        if (optionalUser.isEmpty()) {
            throw new UserDoesNotExistException(oauthProvider.toString(), oauthId);
        }

        User user = optionalUser.get();

        Optional<Prediction> optionalPrediction = predictionRepository.findById(predictionId);

        if (optionalPrediction.isEmpty()) {
            throw new PredictionDoesNotExistsException(predictionId, user.getUsername());
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

}
