import React, { createContext, useContext, useState, useEffect } from 'react';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('berkah_pos_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('berkah_pos_token') || null);
  const [loading, setLoading] = useState(false);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await request.post(API_ENDPOINTS.AUTH.LOGIN, { username, password });
      if (res.success && res.data) {
        const { token: newToken, user: newUser } = res.data;
        localStorage.setItem('berkah_pos_token', newToken);
        localStorage.setItem('berkah_pos_user', JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);
        toast.success(`Selamat datang, ${newUser.nama}! 👋`);
        return { success: true, user: newUser };
      } else {
        toast.error(res.message || 'Login gagal!');
        return { success: false, message: res.message };
      }
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Gagal login. Periksa koneksi atau kredensial Anda.';
      toast.error(errMsg);
      return { success: false, message: errMsg };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('berkah_pos_token');
    localStorage.removeItem('berkah_pos_user');
    setToken(null);
    setUser(null);
    toast.success('Berhasil keluar dari sistem');
  };

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === 'admin';
  const isKasir = user?.role === 'kasir';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        isKasir,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
