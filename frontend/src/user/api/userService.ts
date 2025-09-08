import { appFetch, config } from "../../app/api/appFetch";

export interface UserDTO {
    id: string;
    fullName: string;
    userName: string;
    email: string;
    avatarUrl: string;
    location: string;
    oauthProvider: string;
    createdAt: string;
}

export const getProfile = (): Promise<UserDTO> =>
    new Promise((resolve, reject) => {
        appFetch<UserDTO>(
            "/api/user/profile",
            config("GET"),
            (data?: UserDTO) => {
                if (data !== undefined) {
                    resolve(data);
                } else {
                    reject(new Error("No user data returned"));
                }
            },
            reject
        );
    });

export const logout = (): Promise<void> => appFetch<void>("/api/logout", config("POST"));

