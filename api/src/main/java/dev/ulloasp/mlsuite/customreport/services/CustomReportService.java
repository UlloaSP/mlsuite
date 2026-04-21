package dev.ulloasp.mlsuite.customreport.services;

import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.customreport.dtos.CustomReportDto;

public interface CustomReportService {

    CustomReportDto upload(Long userId, MultipartFile file);

    List<CustomReportDto> list(Long userId);

    List<CustomReportDto> getActive(Long userId);

    CustomReportDto activate(Long userId, String id);

    void deactivate(Long userId, String id);

    void deactivateAll(Long userId);

    void delete(Long userId, String id);
}
