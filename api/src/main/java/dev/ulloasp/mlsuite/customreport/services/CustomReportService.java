package dev.ulloasp.mlsuite.customreport.services;

import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.customreport.dtos.CustomReportDto;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;

public interface CustomReportService {

    CustomReportDto upload(OAuthProvider provider, String oauthId, MultipartFile file);

    List<CustomReportDto> list(OAuthProvider provider, String oauthId);

    List<CustomReportDto> getActive(OAuthProvider provider, String oauthId);

    CustomReportDto activate(OAuthProvider provider, String oauthId, String id);

    void deactivate(OAuthProvider provider, String oauthId, String id);

    void deactivateAll(OAuthProvider provider, String oauthId);

    void delete(OAuthProvider provider, String oauthId, String id);
}
