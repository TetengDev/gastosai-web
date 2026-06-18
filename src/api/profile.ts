import api from "./client";

export interface UserProfileResponse {
  email: string;
  name: string;
  nickname: string | null;
  avatarColor: string | null;
  defaultCategory: string | null;
  avatar: string | null;
}

export interface UpdateProfileRequest {
  name: string;
  nickname: string;
  email: string;
  avatarColor?: string | null;
  defaultCategory?: string | null;
  avatar?: string | null;
}

export interface UpdateProfileResponse extends UserProfileResponse {
  token: string;
}

export const getProfile = () =>
  api.get<UserProfileResponse>("/user/profile").then((r) => r.data);

export const updateProfile = (data: UpdateProfileRequest) =>
  api.put<UpdateProfileResponse>("/user/profile", data).then((r) => r.data);
