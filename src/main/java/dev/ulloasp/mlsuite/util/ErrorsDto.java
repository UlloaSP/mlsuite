package dev.ulloasp.mlsuite.util;

import java.util.List;

public final class ErrorsDto {

    private String globalError;

    private List<FieldErrorDto> fieldErrors;

    public ErrorsDto(String globalError) {
        setGlobalError(globalError);
    }

    public ErrorsDto(List<FieldErrorDto> fieldErrors) {
        setFieldErrors(fieldErrors);
    }

    public String getGlobalError() {
        return globalError;
    }

    public void setGlobalError(String globalError) {
        this.globalError = globalError;
    }

    public List<FieldErrorDto> getFieldErrors() {
        return fieldErrors;
    }

    public void setFieldErrors(List<FieldErrorDto> fieldErrors) {
        this.fieldErrors = fieldErrors;
    }

}
