package dev.ulloasp.mlsuite.signature.services;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;

import dev.ulloasp.mlsuite.model.entities.Model;
import dev.ulloasp.mlsuite.model.exceptions.ModelDoesNotExistsException;
import dev.ulloasp.mlsuite.model.exceptions.ModelNotFromUserException;
import dev.ulloasp.mlsuite.model.repositories.ModelRepository;
import dev.ulloasp.mlsuite.signature.entities.Signature;
import dev.ulloasp.mlsuite.signature.exceptions.SignatureAlreadyExistsException;
import dev.ulloasp.mlsuite.signature.exceptions.SignatureDoesNotExistsException;
import dev.ulloasp.mlsuite.signature.exceptions.SignatureNotFromUserException;
import dev.ulloasp.mlsuite.signature.repositories.SignatureRepository;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.exceptions.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.repository.UserRepository;
import jakarta.annotation.Nullable;
import jakarta.transaction.Transactional;

@Service
@Transactional
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
    public Signature createSignature(OAuthProvider oauthProvider, String oauthId, Long modelId,
            Map<String, Object> inputSignature, String name,
            int major, int minor, int patch, @Nullable Long origin) {
        Optional<User> optionalUser = userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId);

        if (optionalUser.isEmpty()) {
            throw new UserDoesNotExistException(oauthProvider.toString(), oauthId);
        }

        User user = optionalUser.get();

        Optional<Model> optionalModel = modelRepository.findByIdAndUserId(modelId, user.getId());

        if (optionalModel.isEmpty()) {
            throw new ModelDoesNotExistsException(modelId, user.getUsername());
        }

        Model model = optionalModel.get();

        if (signatureRepository.existsByModelIdAndInputSignature(model.getId(), inputSignature)) {
            throw new SignatureAlreadyExistsException(model.getId(), inputSignature);
        }

        Signature signature = new Signature(model, name, inputSignature);

        signature.setMajor(major);
        signature.setMinor(minor);
        signature.setPatch(patch);

        if (origin != null) {
            Optional<Signature> optionalOrigin = signatureRepository.findById(origin);
            if (optionalOrigin.isEmpty()) {
                throw new SignatureDoesNotExistsException(origin);
            }
            signature.setOrigin(optionalOrigin.get());
        }

        return signatureRepository.save(signature);
    }

    @Override
    public Signature updateSignature(OAuthProvider oauthProvider, String oauthId, Long signatureId,
            Map<String, Object> inputSignature) {
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
            throw new SignatureNotFromUserException(signatureId, user.getUsername());
        }

        signature.setInputSignature(inputSignature);

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
            throw new SignatureNotFromUserException(signatureId, user.getUsername());
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
            throw new ModelDoesNotExistsException(modelId, user.getUsername());
        }

        Model model = optionalModel.get();

        if (!model.getUser().getId().equals(user.getId())) {
            throw new ModelNotFromUserException(model.getId(), model.getName(), user.getUsername());
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
            throw new SignatureNotFromUserException(signatureId, user.getUsername());
        }

        signatureRepository.delete(signature);
    }

}
