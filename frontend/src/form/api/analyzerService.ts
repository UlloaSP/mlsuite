import { appFetch } from "../../app/api/appFetch";

export const generateSchema = (
    model: File,
    dataframe?: File
): Promise<any> =>
    new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append("model", model);
        if (dataframe) {
            formData.append("dataframe", dataframe);
        }
        appFetch<any>(
            "/api/analyzer/schema/generate",
            {
                method: "POST",
                body: formData,
            },
            (data?: any) => {
                if (data !== undefined) {
                    resolve(data);
                } else {
                    reject(new Error("No user data returned"));
                }
            },
            reject
        );
    });