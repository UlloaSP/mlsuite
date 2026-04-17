package dev.ulloasp.mlsuite.customexplanation.services;

import java.util.List;
import java.util.Optional;

import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.customexplanation.dtos.CustomExplanationDto;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;

public interface CustomExplanationService {

    CustomExplanationDto upload(OAuthProvider provider, String oauthId, MultipartFile file);

    List<CustomExplanationDto> list(OAuthProvider provider, String oauthId);

    List<CustomExplanationDto> getActive(OAuthProvider provider, String oauthId);

    CustomExplanationDto activate(OAuthProvider provider, String oauthId, String id);

    void deactivate(OAuthProvider provider, String oauthId, String id);

    void delete(OAuthProvider provider, String oauthId, String id);
}
