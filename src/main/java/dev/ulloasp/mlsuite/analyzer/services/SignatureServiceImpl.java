package dev.ulloasp.mlsuite.analyzer.services;

import java.util.List;
import java.util.Optional;

import dev.ulloasp.mlsuite.analyzer.entities.Model;
import dev.ulloasp.mlsuite.analyzer.entities.Signature;
import dev.ulloasp.mlsuite.analyzer.exceptions.ModelDoesNotExistsException;
import dev.ulloasp.mlsuite.analyzer.exceptions.ModelNotFromUserException;
import dev.ulloasp.mlsuite.analyzer.exceptions.SignatureAlreadyExistsException;
import dev.ulloasp.mlsuite.analyzer.exceptions.SignatureDoesNotExistsException;
import dev.ulloasp.mlsuite.analyzer.exceptions.SignatureNotFromUserException;
import dev.ulloasp.mlsuite.analyzer.repository.ModelRepository;
import dev.ulloasp.mlsuite.analyzer.repository.SignatureRepository;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.exceptions.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.repository.UserRepository;

public class SignatureServiceImpl implements SignatureService {

    private final UserRepository userRepository;
    private final SignatureRepository signatureRepository;
    private final ModelRepository modelRepository;

    public SignatureServiceImpl(UserRepository userRepository, SignatureRepository signatureRepository,
            ModelRepository modelRepository) {
        this.userRepository = userRepository;
        this.signatureRepository = signatureRepository;
        this.modelRepository = modelRepository;
    }

    @Override
    public Signature createSignature(OAuthProvider oauthProvider, String oauthId, Long modelId, String inputSignature) {
        Optional<User> optionalUser = userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId);

        if (optionalUser.isEmpty()) {
            throw new UserDoesNotExistException(oauthProvider.toString(), oauthId);
        }

        User user = optionalUser.get();

        Optional<Model> optionalModel = modelRepository.findByIdAndUserId(modelId, user.getId());

        if (optionalModel.isEmpty()) {
            throw new ModelDoesNotExistsException(modelId, user.getDisplayName());
        }

        Model model = optionalModel.get();

        if (signatureRepository.existsByModelIdAndInputSignature(model.getId(), inputSignature)) {
            throw new SignatureAlreadyExistsException(model.getId(), inputSignature);
        }

        Signature signature = new Signature(model,
                signatureRepository.findTopByModelIdOrderByVersionDesc(model.getId()) + 1, inputSignature);

        return signatureRepository.save(signature);
    }

    @Override
    public Signature updateSignature(OAuthProvider oauthProvider, String oauthId, Long signatureId,
            String inputSignature, String outputSignature) {
        Optional<User> optionalUser = userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId);

        if (optionalUser.isEmpty()) {
            throw new UserDoesNotExistException(oauthProvider.toString(), oauthId);
        }

        User user = optionalUser.get();

        Optional<Signature> optionalSignature = signatureRepository.findById(signatureId);

        if (optionalSignature.isEmpty()) {
            throw new SignatureDoesNotExistsException(signatureId);
        }

        Signature signature = optionalSignature.get();

        if (!signature.getModel().getUser().getId().equals(user.getId())) {
            throw new SignatureNotFromUserException(signatureId, user.getDisplayName());
        }

        signature.setInputSignature(inputSignature);
        signature.setOutputSignature(outputSignature);

        return signatureRepository.save(signature);
    }

    @Override
    public Signature getSignature(OAuthProvider oauthProvider, String oauthId, Long signatureId) {
        Optional<User> optionalUser = userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId);

        if (optionalUser.isEmpty()) {
            throw new UserDoesNotExistException(oauthProvider.toString(), oauthId);
        }

        User user = optionalUser.get();

        Optional<Signature> optionalSignature = signatureRepository.findById(signatureId);

        if (optionalSignature.isEmpty()) {
            throw new SignatureDoesNotExistsException(signatureId);
        }

        Signature signature = optionalSignature.get();

        if (!signature.getModel().getUser().getId().equals(user.getId())) {
            throw new SignatureNotFromUserException(signatureId, user.getDisplayName());
        }

        return signature;
    }

    @Override
    public List<Signature> getSignatureByModelId(OAuthProvider oauthProvider, String oauthId, Long modelId) {
        Optional<User> optionalUser = userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId);

        if (optionalUser.isEmpty()) {
            throw new UserDoesNotExistException(oauthProvider.toString(), oauthId);
        }

        User user = optionalUser.get();

        Optional<Model> optionalModel = modelRepository.findById(modelId);

        if (optionalModel.isEmpty()) {
            throw new ModelDoesNotExistsException(modelId, user.getDisplayName());
        }

        Model model = optionalModel.get();

        if (!model.getUser().getId().equals(user.getId())) {
            throw new ModelNotFromUserException(model.getId(), model.getName(), user.getDisplayName());
        }

        return signatureRepository.findByModelId(model.getId());
    }

    @Override
    public void deleteSignature(OAuthProvider oauthProvider, String oauthId, Long signatureId) {
        Optional<User> optionalUser = userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId);

        if (optionalUser.isEmpty()) {
            throw new UserDoesNotExistException(oauthProvider.toString(), oauthId);
        }

        User user = optionalUser.get();

        Optional<Signature> optionalSignature = signatureRepository.findById(signatureId);

        if (optionalSignature.isEmpty()) {
            throw new SignatureDoesNotExistsException(signatureId);
        }

        Signature signature = optionalSignature.get();

        if (!signature.getModel().getUser().getId().equals(user.getId())) {
            throw new SignatureNotFromUserException(signatureId, user.getDisplayName());
        }

        signatureRepository.delete(signature);
    }

}
