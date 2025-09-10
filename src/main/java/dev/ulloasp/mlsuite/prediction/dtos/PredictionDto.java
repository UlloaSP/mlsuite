package dev.ulloasp.mlsuite.prediction.dtos;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import dev.ulloasp.mlsuite.prediction.entities.Prediction;
import dev.ulloasp.mlsuite.prediction.entities.PredictionStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Setter
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class PredictionDto {
    private Long id;
    private Long signatureId;
    private Long modelId;
    private String name;
    private Map<String, Object> inputs;
    private Map<String, Object> prediction;
    private PredictionStatus status;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public static final PredictionDto toDto(Prediction prediction) {
        return new PredictionDto(
                prediction.getId(),
                prediction.getSignature().getId(),
                prediction.getSignature().getModel().getId(),
                prediction.getName(),
                prediction.getData(),
                prediction.getPrediction(),
                prediction.getStatus(),
                prediction.getCreatedAt(),
                prediction.getUpdatedAt());
    }

    public static final List<PredictionDto> toDtoList(List<Prediction> predictions) {
        return predictions.stream()
                .map(PredictionDto::toDto)
                .toList();
    }
}
