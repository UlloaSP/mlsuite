package dev.ulloasp.mlsuite.model.dtos;

import dev.ulloasp.mlsuite.model.entities.Model;
import dev.ulloasp.mlsuite.signature.dtos.SignatureDto;
import dev.ulloasp.mlsuite.signature.entities.Signature;
import jakarta.annotation.Nullable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Setter
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class CreateModelDto {
    private ModelDto model;
    private SignatureDto signatureFromModel;
    private @Nullable SignatureDto signatureFromDataframe;

    public static final CreateModelDto toDto(Model model, Signature signatureFromModel,
            Signature signatureFromDataframe) {
        return new CreateModelDto(
                ModelDto.toDto(model),
                SignatureDto.toDto(signatureFromModel),
                signatureFromDataframe != null ? SignatureDto.toDto(signatureFromDataframe) : null);
    }
}
