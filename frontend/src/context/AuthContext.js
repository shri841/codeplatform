import React, { createContext, useContext, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const role = sessionStorage.getItem('role');
    const username = sessionStorage.getItem('username');
    const token = sessionStorage.getItem('access_token');
    return token ? { role, username, token } : null;
  });

  const login = async (username, password) => {
    const res = await api.post('/auth/login/', { username, password });
    const { access, refresh, role, username: uname } = res.data;
    sessionStorage.setItem('access_token', access);
    sessionStorage.setItem('refresh_token', refresh);
    sessionStorage.setItem('role', role);
    sessionStorage.setItem('username', uname);
    setAuth({ role, username: uname, token: access });
    return role;
  };

  const logout = () => {
    sessionStorage.clear();
    setAuth(null);
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
