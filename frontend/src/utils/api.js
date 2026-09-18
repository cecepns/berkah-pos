import axios from 'axios';
import toast from 'react-hot-toast';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://api.kingcreativestudio.my.id/berkah-pos/api',
  timeout: 15000,
  headers: {
    'Accept': 'application/json',
  },
});

// Request interceptor to attach Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('berkah_pos_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor for unified error toast & handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Terjadi kesalahan saat menghubungkan ke server';

    // Only toast on client/network level or unexpected 500s when appropriate
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message,
    });

    return Promise.reject(error);
  }
);
