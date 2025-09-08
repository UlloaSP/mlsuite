package dev.ulloasp.mlsuite.model.controllers;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.dtos.CreateModelDto;
import dev.ulloasp.mlsuite.model.dtos.ModelDto;
import dev.ulloasp.mlsuite.model.entities.Model;
import dev.ulloasp.mlsuite.model.services.AnalyzerService;
import dev.ulloasp.mlsuite.model.services.ModelService;
import dev.ulloasp.mlsuite.signature.entities.Signature;
import dev.ulloasp.mlsuite.signature.services.SignatureService;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import jakarta.annotation.Nullable;

@RestController
public class ModelControllerImpl implements ModelController {

        private final ModelService modelService;
        private final SignatureService signatureService;
        private final AnalyzerService analyzerService;

        public ModelControllerImpl(ModelService modelService, SignatureService signatureService,
                        AnalyzerService analyzerService) {
                this.modelService = modelService;
                this.signatureService = signatureService;
                this.analyzerService = analyzerService;
        }

        @Override
        public ResponseEntity<CreateModelDto> createModel(OAuth2AuthenticationToken authentication,
                        @RequestParam String name,
                        @RequestParam MultipartFile modelFile,
                        @RequestParam @Nullable MultipartFile dataframeFile) {

                Model model = this.modelService.createModel(
                                OAuthProvider.fromString(authentication.getAuthorizedClientRegistrationId()),
                                authentication.getPrincipal().getName(), name, modelFile);

                Map<String, Object> schemaFromModel = this.analyzerService.generateInputSignature(
                                OAuthProvider.fromString(authentication.getAuthorizedClientRegistrationId()),
                                authentication.getPrincipal().getName(), modelFile, null);
                Signature signatureFromModel = this.signatureService.createSignature(
                                OAuthProvider.fromString(authentication.getAuthorizedClientRegistrationId()),
                                authentication.getPrincipal().getName(), model.getId(),
                                schemaFromModel, "Model", 0, 0, 0, null);

                Signature signatureFromDataframe = null;

                if (dataframeFile != null) {
                        Map<String, Object> schemaFromDataframe = this.analyzerService.generateInputSignature(
                                        OAuthProvider.fromString(authentication.getAuthorizedClientRegistrationId()),
                                        authentication.getPrincipal().getName(), modelFile, dataframeFile);

                        signatureFromDataframe = this.signatureService.createSignature(
                                        OAuthProvider.fromString(authentication.getAuthorizedClientRegistrationId()),
                                        authentication.getPrincipal().getName(), model.getId(),
                                        schemaFromDataframe, "Dataframe", 0, 0, 1, signatureFromModel.getId());
                }

                return ResponseEntity.status(HttpStatus.CREATED)
                                .body(CreateModelDto.toDto(model, signatureFromModel, signatureFromDataframe));
        }

        @Override
        public ResponseEntity<List<ModelDto>> getAllModels(OAuth2AuthenticationToken authentication) {
                List<Model> models = this.modelService.getModelByUserId(
                                OAuthProvider.fromString(authentication.getAuthorizedClientRegistrationId()),
                                authentication.getPrincipal().getName());

                return ResponseEntity.ok(ModelDto.toDtoList(models));
        }

}
