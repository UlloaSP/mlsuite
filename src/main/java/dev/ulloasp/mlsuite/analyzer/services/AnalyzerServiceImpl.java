package dev.ulloasp.mlsuite.analyzer.services;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.analyzer.repository.ModelRepository;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import jakarta.annotation.Nullable;
import jakarta.transaction.Transactional;

@Service
@Transactional
public class AnalyzerServiceImpl implements AnalyzerService {

        @Autowired
        private RestTemplate restTemplate;

        private final ModelRepository modelRepository;

        public AnalyzerServiceImpl(ModelRepository modelRepository) {
                this.modelRepository = modelRepository;
        }

        @SuppressWarnings("unchecked")
        @Override
        public Map<String, Object> generateInputSignature(OAuthProvider oauthProvider, String oauthId,
                        MultipartFile model,
                        @Nullable MultipartFile dataframe) {
                org.springframework.util.LinkedMultiValueMap<String, Object> body = new org.springframework.util.LinkedMultiValueMap<>();
                body.add("model_file", model.getResource());
                if (dataframe != null) {
                        body.add("df_file", dataframe.getResource());
                }

                org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
                headers.setContentType(org.springframework.http.MediaType.MULTIPART_FORM_DATA);

                org.springframework.http.HttpEntity<org.springframework.util.MultiValueMap<String, Object>> requestEntity = new org.springframework.http.HttpEntity<>(
                                body, headers);

                Object response = restTemplate.postForObject(
                                "http://localhost:8000/build_schema",
                                requestEntity,
                                Map.class);
                System.out.println("Response from build_schema: " + response);

                return (Map<String, Object>) response;
        }

        @SuppressWarnings("unchecked")
        @Override
        public Map<String, Object> predict(OAuthProvider oauthProvider, String oauthId, Long modelId,
                        Map<String, Object> data) {

                org.springframework.util.LinkedMultiValueMap<String, Object> body = new org.springframework.util.LinkedMultiValueMap<>();
                body.add("model_file", this.modelRepository.findById(modelId)
                                .orElseThrow(() -> new IllegalArgumentException("Model not found")).getBlob());
                body.add("data", data);

                org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
                headers.setContentType(org.springframework.http.MediaType.MULTIPART_FORM_DATA);

                org.springframework.http.HttpEntity<org.springframework.util.MultiValueMap<String, Object>> requestEntity = new org.springframework.http.HttpEntity<>(
                                body, headers);

                Object response = restTemplate.postForObject(
                                "http://localhost:8000/predict",
                                requestEntity,
                                Map.class);
                System.out.println("Response from predict: " + response);

                return (Map<String, Object>) response;
        }

        @SuppressWarnings("unchecked")
        @Override
        public Map<String, Object> predict(OAuthProvider oauthProvider, String oauthId, MultipartFile modelBlob,
                        Map<String, Object> data) {
                org.springframework.util.LinkedMultiValueMap<String, Object> body = new org.springframework.util.LinkedMultiValueMap<>();
                body.add("model_file", modelBlob.getResource());
                body.add("data", data);

                org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
                headers.setContentType(org.springframework.http.MediaType.MULTIPART_FORM_DATA);

                org.springframework.http.HttpEntity<org.springframework.util.MultiValueMap<String, Object>> requestEntity = new org.springframework.http.HttpEntity<>(
                                body, headers);

                Object response = restTemplate.postForObject(
                                "http://localhost:8000/predict",
                                requestEntity,
                                Map.class);
                System.out.println("Response from predict: " + response);

                return (Map<String, Object>) response;
        }

}
