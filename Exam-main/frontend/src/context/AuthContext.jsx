import React, { useState } from "react";
export const AuthContext = React.createContext();

export function AuthProvider({ children }) {
  const savedUser = JSON.parse(localStorage.getItem("user") || "null");
  const savedToken = localStorage.getItem("token");

  const [user, setUser] = useState(savedUser);
  const [token, setToken] = useState(savedToken);

  const login = (userData, jwt) => {
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", jwt);
    setUser(userData);
    setToken(jwt);
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
