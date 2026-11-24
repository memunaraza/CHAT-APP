import { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";
import { clearToken, getToken, setToken } from "../lib/token";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Page refresh par token se user wapas load karo
  useEffect(() => {
    if (!getToken()) return setLoading(false);
    api
      .get("/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const authenticate = async (path, payload) => {
    const { data } = await api.post(path, payload);
    setToken(data.token);
    setUser(data.user);
  };

  const login = (payload) => authenticate("/auth/login", payload);
  const register = (payload) => authenticate("/auth/register", payload);
  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
