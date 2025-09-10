import { appFetch } from "../../app/api/appFetch";

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
	appFetch<UserDTO>("/api/user/profile");

export const logout = (): Promise<void> =>
	appFetch<void>("/api/logout", { method: "POST" });