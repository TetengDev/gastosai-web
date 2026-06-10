import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { login as apiLogin, register as apiRegister } from "../api/auth";
import type { LoginRequest, RegisterRequest } from "../api/auth";
import { updateProfile as apiUpdateProfile } from "../api/profile";
import type { UpdateProfileRequest } from "../api/profile";

interface AuthUser {
  email: string;
  name: string;
  nickname: string | null;
  avatarColor: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  updateProfile: (data: UpdateProfileRequest) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const token = localStorage.getItem("token");
    const stored = localStorage.getItem("auth_user");
    if (token && stored) {
      try {
        return JSON.parse(stored) as AuthUser;
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("auth_user");
      }
    }
    return null;
  });

  const persistUser = (authUser: AuthUser) => {
    localStorage.setItem("auth_user", JSON.stringify(authUser));
    setUser(authUser);
  };

  const login = async (data: LoginRequest) => {
    const res = await apiLogin(data);
    localStorage.setItem("token", res.token);
    persistUser({ email: res.email, name: res.name, nickname: res.nickname ?? null, avatarColor: res.avatarColor ?? null });
  };

  const register = async (data: RegisterRequest) => {
    const res = await apiRegister(data);
    localStorage.setItem("token", res.token);
    persistUser({ email: res.email, name: res.name, nickname: res.nickname ?? null, avatarColor: res.avatarColor ?? null });
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("auth_user");
    setUser(null);
  };

  const updateProfile = async (data: UpdateProfileRequest) => {
    const res = await apiUpdateProfile(data);
    localStorage.setItem("token", res.token);
    persistUser({ email: res.email, name: res.name, nickname: res.nickname ?? null, avatarColor: res.avatarColor ?? null });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading: false, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
