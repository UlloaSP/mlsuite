package dev.ulloasp.mlsuite.prediction.dtos;

import com.fasterxml.jackson.databind.JsonNode;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreateTargetParams {
    private Long predictionId;
    private int order;
    private JsonNode value;
}
