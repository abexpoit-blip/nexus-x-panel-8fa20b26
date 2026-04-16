import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api, tokenStore } from "@/lib/api";

export type UserRole = "admin" | "agent";

interface User {
  id: number;
  username: string;
  role: UserRole;
  balance: number;
  otp_count: number;
  daily_limit?: number;
  per_request_limit?: number;
  full_name?: string;
  phone?: string;
  telegram?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  signupEnabled: boolean;
  setSignupEnabled: (enabled: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("nexus_user");
    return stored ? JSON.parse(stored) : null;
  });

  // Re-validate token on mount
  useEffect(() => {
    if (!tokenStore.get()) return;
    api.me().then(({ user }) => {
      setUser(user);
      localStorage.setItem("nexus_user", JSON.stringify(user));
    }).catch(() => {
      tokenStore.clear();
      localStorage.removeItem("nexus_user");
      setUser(null);
    });
  }, []);

  const [signupEnabled, setSignupEnabledState] = useState(() => {
    return localStorage.getItem("nexus_signup_enabled") !== "false";
  });

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const { token, user } = await api.login(username, password);
      tokenStore.set(token);
      localStorage.setItem("nexus_user", JSON.stringify(user));
      setUser(user);
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    localStorage.removeItem("nexus_user");
    setUser(null);
  }, []);

  const setSignupEnabled = useCallback((enabled: boolean) => {
    setSignupEnabledState(enabled);
    localStorage.setItem("nexus_signup_enabled", String(enabled));
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, signupEnabled, setSignupEnabled }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
