package dev.ulloasp.mlsuite.model.services;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.entities.Model;
import dev.ulloasp.mlsuite.model.exceptions.AnalyzerServiceException;
import dev.ulloasp.mlsuite.model.exceptions.ModelAlreadyExistsException;
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

    @Value("${analyzer.url}")
    private String analyzerUrl;

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
        Map<String, Object> response;
        try {
            Object responseObj = restTemplate.postForObject(
                    analyzerUrl + "/metadata",
                    requestEntity,
                    Map.class);

            response = (Map<String, Object>) responseObj;
        } catch (RestClientResponseException ex) {
            // FastAPI returned 4xx/5xx (e.g., HTTPException(400, "Not a sklearn
            // estimator."))
            throw AnalyzerServiceException.fromRestClient(ex, analyzerUrl + "/metadata");
        } catch (ResourceAccessException ex) {
            // Network/unavailable
            throw AnalyzerServiceException.fromNetwork(ex, analyzerUrl + "/metadata");
        }
        String type = response.get("type") != null ? response.get("type").toString() : null;
        String specificType = response.get("specificType") != null ? response.get("specificType").toString() : null;
        String fileName = response.get("fileName") != null ? response.get("fileName").toString() : null;

        Model model = new Model(user, name, type, specificType, fileName, modelBytes);
        return modelRepository.save(model);
    }

    @Override
    public List<Model> getModels(OAuthProvider oauthProvider, String oauthId) {
        Optional<User> optionalUser = userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId);

        if (optionalUser.isEmpty()) {
            throw new UserDoesNotExistException(oauthProvider.toString(), oauthId);
        }

        User user = optionalUser.get();

        return modelRepository.findByUserId(user.getId());
    }

}
