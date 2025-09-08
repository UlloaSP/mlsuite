package dev.ulloasp.mlsuite.prediction.dtos;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Setter
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class UpdateTargetParams {
    private Long targetId;
    private Object realValue;
}
