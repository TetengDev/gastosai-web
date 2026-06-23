import api from "./client";

export interface AuthResponse {
  token: string;
  email: string;
  name: string;
  nickname: string | null;
  avatarColor: string | null;
  defaultCategory: string | null;
  avatar: string | null;
  firstLogin: boolean;
  role: string;
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

export const requestMagicLink = (email: string): Promise<void> =>
  api.post("/auth/magic-link", { email }).then(() => undefined);

export const verifyMagicLink = (token: string): Promise<AuthResponse> =>
  api.post<AuthResponse>("/auth/magic-link/verify", { token }).then((r) => r.data);

export const googleLogin = (idToken: string): Promise<AuthResponse> =>
  api.post<AuthResponse>("/auth/google", { idToken }).then((r) => r.data);
