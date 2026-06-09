import api from "./client";

export interface UserProfileResponse {
  email: string;
  name: string;
  nickname: string | null;
}

export interface UpdateProfileRequest {
  name: string;
  nickname: string;
}

export const getProfile = () =>
  api.get<UserProfileResponse>("/user/profile").then((r) => r.data);

export const updateProfile = (data: UpdateProfileRequest) =>
  api.put<UserProfileResponse>("/user/profile", data).then((r) => r.data);
