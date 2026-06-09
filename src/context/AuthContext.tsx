import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { login as apiLogin, register as apiRegister } from "../api/auth";
import type { LoginRequest, RegisterRequest } from "../api/auth";

interface AuthUser {
  email: string;
  name: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const stored = localStorage.getItem("auth_user");
    if (token && stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("auth_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (data: LoginRequest) => {
    const res = await apiLogin(data);
    localStorage.setItem("token", res.token);
    const authUser = { email: res.email, name: res.name };
    localStorage.setItem("auth_user", JSON.stringify(authUser));
    setUser(authUser);
  };

  const register = async (data: RegisterRequest) => {
    const res = await apiRegister(data);
    localStorage.setItem("token", res.token);
    const authUser = { email: res.email, name: res.name };
    localStorage.setItem("auth_user", JSON.stringify(authUser));
    setUser(authUser);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("auth_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
