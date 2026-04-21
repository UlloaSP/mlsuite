package dev.ulloasp.mlsuite.customfield.services;

import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.customfield.dtos.CustomFieldDto;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;

public interface CustomFieldService {

    CustomFieldDto upload(OAuthProvider provider, String oauthId, MultipartFile file);

    List<CustomFieldDto> list(OAuthProvider provider, String oauthId);

    List<CustomFieldDto> getActive(OAuthProvider provider, String oauthId);

    CustomFieldDto activate(OAuthProvider provider, String oauthId, String id);

    void deactivate(OAuthProvider provider, String oauthId, String id);

    void deactivateAll(OAuthProvider provider, String oauthId);

    void delete(OAuthProvider provider, String oauthId, String id);
}
