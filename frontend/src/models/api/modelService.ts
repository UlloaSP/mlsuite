import { appFetch, config } from '../../app/api/appFetch';

export interface CreateModelRequest {
    name: string;
    modelFile: File;
    dataframeFile?: File;
}

export interface CreateSignatureRequest {
    modelId: string;
    name: string;
    inputSignature: Map<string, object>;
    major: number;
    minor: number;
    patch: number;
    origin?: string;
}

export interface CreatePredictionRequest {
    signatureId: string;
    name: string;
    inputs: Map<string, object>;
    prediction: Map<string, object>;
}

export interface CreateTargetRequest {
    predictionId: string;
    order: number;
    value: string;
}

export interface UpdatePredictionRequest {
    predictionId: string;
    status: string;
}

export interface UpdateTargetRequest {
    targetId: string;
    realValue: object;
}

export interface GetAllSignaturesRequest {
    modelId: string;
}

export interface GetPredictionsRequest {
    signatureId: string;
}

export interface GetTargetsRequest {
    predictionId: string;
}

export interface GetSignatureRequest {
    signatureId: string;
}

export interface ModelDto {
    id: string;
    name: string;
    type: string;
    specificType: string;
    fileName: string;
    createdAt: string;
}

export interface SignatureDto {
    id: string;
    modelId: string;
    name: string;
    inputSignature: Map<string, object>;
    major: number;
    minor: number;
    patch: number;
    origin?: SignatureDto;
    createdAt: string;
}

export interface PredictionDto {
    id: string;
    signatureId: string;
    modelId: string;
    name: string;
    inputs: Map<string, object>;
    prediction: Map<string, object>;
    status: object;
    createdAt: string;
    updatedAt?: string;
}

export interface TargetDto {
    id: string;
    predictionId: string;
    order: number;
    value: object;
    realValue?: object;
    createdAt: string;
    updatedAt?: string;
}


export interface CreateModelDto {
    model: ModelDto;
    signatureFromModel: SignatureDto;
    signatureFromDataframe: SignatureDto;
}

export const createModel = ({ name, modelFile, dataframeFile }: CreateModelRequest): Promise<CreateModelDto> => {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('modelFile', modelFile);
    if (dataframeFile) {
        formData.append('dataframeFile', dataframeFile);
    }

    return new Promise((resolve, reject) => {
        appFetch<CreateModelDto>(
            "/api/model/create",
            config("POST", formData),
            (data) => resolve(data!),
            (errors) => reject(errors),
        );
    })
};

export const createSignature = (request: CreateSignatureRequest): Promise<SignatureDto> => {

    return new Promise((resolve, reject) => {
        appFetch<SignatureDto>(
            "/api/signature/create",
            config("POST", request as Record<string, any>),
            (data) => resolve(data!),
            (errors) => reject(errors),
        );
    })
};

export const createPrediction = (params: CreatePredictionRequest): Promise<PredictionDto> => {
    return new Promise((resolve, reject) => {
        appFetch<PredictionDto>(
            "/api/prediction/create",
            config("POST", params as Record<string, any>),
            (data) => resolve(data!),
            (errors) => reject(errors),
        );
    });
};

export const createTarget = (params: CreateTargetRequest): Promise<TargetDto> => {
    return new Promise((resolve, reject) => {
        appFetch<TargetDto>(
            "/api/target/create",
            config("POST", params as Record<string, any>),
            (data) => resolve(data!),
            (errors) => reject(errors),
        );
    });
};

export const updatePrediction = (params: UpdatePredictionRequest): Promise<PredictionDto> => {
    return new Promise((resolve, reject) => {
        appFetch<PredictionDto>(
            "/api/prediction/update",
            config("POST", params as Record<string, any>),
            (data) => resolve(data!),
            (errors) => reject(errors),
        );
    });
};

export const updateTarget = (params: UpdateTargetRequest): Promise<TargetDto> => {
    return new Promise((resolve, reject) => {
        appFetch<TargetDto>(
            "/api/target/update",
            config("POST", params as Record<string, any>),
            (data) => resolve(data!),
            (errors) => reject(errors),
        );
    });
};

export const getModels = (): Promise<ModelDto[]> => {
    return new Promise((resolve, reject) => {
        appFetch<ModelDto[]>(
            "/api/model/all",
            config("GET"),
            (data) => resolve(data!),
            (error) => reject(error)
        );
    });
};

export const getSignatures = ({ modelId }: GetAllSignaturesRequest): Promise<SignatureDto[]> => {
    return new Promise((resolve, reject) => {
        const url = `/api/signature/all?modelId=${encodeURIComponent(modelId)}`;
        appFetch<SignatureDto[]>(
            url,
            config("GET"),
            (data) => resolve(data!),
            (error) => reject(error)
        );
    });
};

export const getPredictions = ({ signatureId }: GetPredictionsRequest): Promise<PredictionDto[]> => {
    return new Promise((resolve, reject) => {
        const url = `/api/prediction/all?signatureId=${encodeURIComponent(signatureId)}`;
        appFetch<PredictionDto[]>(
            url,
            config("GET"),
            (data) => resolve(data!),
            (error) => reject(error)
        );
    });
}

export const getTargets = ({ predictionId }: GetTargetsRequest): Promise<TargetDto[]> => {
    return new Promise((resolve, reject) => {
        const url = `/api/target/all?predictionId=${encodeURIComponent(predictionId)}`;
        appFetch<TargetDto[]>(
            url,
            config("GET"),
            (data) => resolve(data!),
            (error) => reject(error)
        );
    });
}

export const getSignature = ({ signatureId }: GetSignatureRequest): Promise<SignatureDto> => {
    return new Promise((resolve, reject) => {
        const url = `/api/signature/${encodeURIComponent(signatureId)}`;
        appFetch<SignatureDto>(
            url,
            config("GET"),
            (data) => resolve(data!),
            (error) => reject(error)
        );
    });
}