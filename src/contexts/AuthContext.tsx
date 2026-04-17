import React, { useState, useCallback, useEffect } from "react";
import { api, tokenStore } from "@/lib/api";
import { AuthContext, type User } from "./auth-context";

// Re-export so existing `import { useAuth } from "@/contexts/AuthContext"` keeps working
export { useAuth } from "@/hooks/useAuth";
export type { UserRole, User, AuthContextType } from "./auth-context";

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
