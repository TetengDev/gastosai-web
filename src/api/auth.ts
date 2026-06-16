import api from "./client";

export interface AuthResponse {
  token: string;
  email: string;
  name: string;
  nickname: string | null;
  avatarColor: string | null;
  firstLogin: boolean;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export const register = (data: RegisterRequest) =>
  api.post<AuthResponse>("/auth/register", data).then((r) => r.data);

export const login = (data: LoginRequest) =>
  api.post<AuthResponse>("/auth/login", data).then((r) => r.data);
