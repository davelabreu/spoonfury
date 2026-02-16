import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { api } from "@/lib/api";

interface AuthContextType {
  token: string | null;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password1: string, password2: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [username, setUsername] = useState<string | null>(localStorage.getItem("username"));

  const login = async (username: string, password: string) => {
    const data = await api.post("/auth/login/", { username, password });
    localStorage.setItem("token", data.key);
    localStorage.setItem("username", username);
    setToken(data.key);
    setUsername(username);
  };

  const register = async (username: string, email: string, password1: string, password2: string) => {
    const data = await api.post("/auth/registration/", { username, email, password1, password2 });
    
    let authToken = data?.key;

    // If registration didn't return a token (e.g. 204 No Content), perform login
    if (!authToken) {
      const loginData = await api.post("/auth/login/", { username, password: password1 });
      authToken = loginData.key;
    }

    localStorage.setItem("token", authToken);
    localStorage.setItem("username", username);
    setToken(authToken);
    setUsername(username);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setToken(null);
    setUsername(null);
  };

  return (
    <AuthContext.Provider value={{ token, username, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
