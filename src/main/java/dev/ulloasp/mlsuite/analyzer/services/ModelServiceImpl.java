package dev.ulloasp.mlsuite.analyzer.services;

import java.util.List;
import java.util.Optional;

import dev.ulloasp.mlsuite.analyzer.entities.Model;
import dev.ulloasp.mlsuite.analyzer.exceptions.ModelAlreadyExistsException;
import dev.ulloasp.mlsuite.analyzer.exceptions.ModelDoesNotExistsException;
import dev.ulloasp.mlsuite.analyzer.exceptions.ModelNameAlreadyExistsException;
import dev.ulloasp.mlsuite.analyzer.exceptions.ModelNotFromUserException;
import dev.ulloasp.mlsuite.analyzer.repository.ModelRepository;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.exceptions.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.repository.UserRepository;

public class ModelServiceImpl implements ModelService {

    private final UserRepository userRepository;
    private final ModelRepository modelRepository;

    public ModelServiceImpl(UserRepository userRepository, ModelRepository modelRepository) {
        this.userRepository = userRepository;
        this.modelRepository = modelRepository;
    }

    @Override
    public Model createModel(OAuthProvider oauthProvider, String oauthId, String name, byte[] blob) {
        Optional<User> optionalUser = userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId);

        if (optionalUser.isEmpty()) {
            throw new UserDoesNotExistException(oauthProvider.toString(), oauthId);
        }

        User user = optionalUser.get();

        if (modelRepository.existsByNameAndUserId(name, user.getId())) {
            throw new ModelAlreadyExistsException(name, user.getDisplayName());
        }

        Model model = new Model(user, name, blob);
        return modelRepository.save(model);
    }

    @Override
    public Model updateModel(OAuthProvider oauthProvider, String oauthId, Long modelId, String name) {
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

        if (modelRepository.existsByNameAndUserId(name, user.getId())) {
            throw new ModelNameAlreadyExistsException(model.getName(), user.getDisplayName());
        }

        model.setName(name);

        return modelRepository.save(model);

    }

    @Override
    public Model getModel(OAuthProvider oauthProvider, String oauthId, Long modelId) {
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

        return model;
    }

    @Override
    public List<Model> getModelByUserId(OAuthProvider oauthProvider, String oauthId) {
        Optional<User> optionalUser = userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId);

        if (optionalUser.isEmpty()) {
            throw new UserDoesNotExistException(oauthProvider.toString(), oauthId);
        }

        User user = optionalUser.get();

        return modelRepository.findByUserId(user.getId());
    }

    @Override
    public void deleteModel(OAuthProvider oauthProvider, String oauthId, Long modelId) {
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

        modelRepository.delete(model);
    }

}
