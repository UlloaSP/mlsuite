package dev.ulloasp.mlsuite.model.dtos;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.stream.Collectors;

import dev.ulloasp.mlsuite.model.entities.Model;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class ModelDto {
    private Long id;
    private String name;
    private String type;
    private String specificType;
    private String fileName;
    private OffsetDateTime createdAt;

    public static final ModelDto toDto(Model model) {
        return new ModelDto(
                model.getId(),
                model.getName(),
                model.getType(),
                model.getSpecificType(),
                model.getFileName(),
                model.getCreatedAt());
    }

    public static final List<ModelDto> toDtoList(List<Model> models) {
        return models.stream()
                .map(ModelDto::toDto)
                .collect(Collectors.toList());
    }
}
