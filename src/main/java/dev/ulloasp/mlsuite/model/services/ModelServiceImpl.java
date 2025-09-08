package dev.ulloasp.mlsuite.model.services;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.entities.Model;
import dev.ulloasp.mlsuite.model.exceptions.ModelAlreadyExistsException;
import dev.ulloasp.mlsuite.model.exceptions.ModelDoesNotExistsException;
import dev.ulloasp.mlsuite.model.exceptions.ModelNameAlreadyExistsException;
import dev.ulloasp.mlsuite.model.exceptions.ModelNotFromUserException;
import dev.ulloasp.mlsuite.model.repositories.ModelRepository;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.exceptions.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.repository.UserRepository;
import jakarta.transaction.Transactional;

@Service
@Transactional
public class ModelServiceImpl implements ModelService {

    @Autowired
    private RestTemplate restTemplate;
    private final UserRepository userRepository;
    private final ModelRepository modelRepository;

    public ModelServiceImpl(UserRepository userRepository, ModelRepository modelRepository) {
        this.userRepository = userRepository;
        this.modelRepository = modelRepository;
    }

    @Override
    public Model createModel(OAuthProvider oauthProvider, String oauthId, String name, MultipartFile modelFile) {
        Optional<User> optionalUser = userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId);

        if (optionalUser.isEmpty()) {
            throw new UserDoesNotExistException(oauthProvider.toString(), oauthId);
        }

        User user = optionalUser.get();

        if (modelRepository.existsByNameAndUserId(name, user.getId())) {
            throw new ModelAlreadyExistsException(name, user.getUsername());
        }
        final byte[] modelBytes;

        try {
            modelBytes = modelFile.getBytes();
        } catch (Exception e) {
            throw new IllegalArgumentException("Model file is empty or invalid", e);
        }

        LinkedMultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("model_file", modelFile.getResource());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        Object responseObj = restTemplate.postForObject(
                "http://localhost:8000/model/metadata",
                requestEntity,
                Map.class);

        @SuppressWarnings("unchecked")
        Map<String, Object> response = (Map<String, Object>) responseObj;
        if (response == null) {
            throw new IllegalStateException("Failed to retrieve model metadata from the analysis service");
        }
        String type = response.get("type") != null ? response.get("type").toString() : null;
        String specificType = response.get("specificType") != null ? response.get("specificType").toString() : null;
        String fileName = response.get("fileName") != null ? response.get("fileName").toString() : null;

        Model model = new Model(user, name, type, specificType, fileName, modelBytes);
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
            throw new ModelDoesNotExistsException(modelId, user.getUsername());
        }

        Model model = optionalModel.get();

        if (!model.getUser().getId().equals(user.getId())) {
            throw new ModelNotFromUserException(model.getId(), model.getName(), user.getUsername());
        }

        if (modelRepository.existsByNameAndUserId(name, user.getId())) {
            throw new ModelNameAlreadyExistsException(model.getName(), user.getUsername());
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
            throw new ModelDoesNotExistsException(modelId, user.getUsername());
        }

        Model model = optionalModel.get();

        if (!model.getUser().getId().equals(user.getId())) {
            throw new ModelNotFromUserException(model.getId(), model.getName(), user.getUsername());
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
            throw new ModelDoesNotExistsException(modelId, user.getUsername());
        }

        Model model = optionalModel.get();

        if (!model.getUser().getId().equals(user.getId())) {
            throw new ModelNotFromUserException(model.getId(), model.getName(), user.getUsername());
        }

        modelRepository.delete(model);
    }

}
