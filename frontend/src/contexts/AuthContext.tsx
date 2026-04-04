import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { api } from "@/lib/api";

interface AuthContextType {
  token: string | null;
  username: string | null;
  isStaff: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password1: string, password2: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function fetchIsStaff(token: string): Promise<boolean> {
  try {
    const data = await api.get("/auth/user/", token) as { is_staff?: boolean };
    return data.is_staff === true;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [username, setUsername] = useState<string | null>(localStorage.getItem("username"));
  const [isStaff, setIsStaff] = useState<boolean>(localStorage.getItem("is_staff") === "true");

  const login = async (username: string, password: string) => {
    const data = await api.post("/auth/login/", { username, password });
    const authToken = data.key;
    localStorage.setItem("token", authToken);
    localStorage.setItem("username", username);
    setToken(authToken);
    setUsername(username);

    const staff = await fetchIsStaff(authToken);
    localStorage.setItem("is_staff", String(staff));
    setIsStaff(staff);
  };

  const register = async (username: string, email: string, password1: string, password2: string) => {
    const data = await api.post("/auth/registration/", { username, email, password1, password2 });

    let authToken = data?.key;
    if (!authToken) {
      const loginData = await api.post("/auth/login/", { username, password: password1 });
      authToken = loginData.key;
    }

    localStorage.setItem("token", authToken);
    localStorage.setItem("username", username);
    setToken(authToken);
    setUsername(username);

    const staff = await fetchIsStaff(authToken);
    localStorage.setItem("is_staff", String(staff));
    setIsStaff(staff);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("is_staff");
    setToken(null);
    setUsername(null);
    setIsStaff(false);
  };

  return (
    <AuthContext.Provider value={{ token, username, isStaff, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
