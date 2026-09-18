import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Layout from '@/components/layout/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Komoditas from '@/pages/Komoditas';
import Kasir from '@/pages/Kasir';
import Produk from '@/pages/Produk';
import Pelanggan from '@/pages/Pelanggan';
import Hutang from '@/pages/Hutang';
import Titipan from '@/pages/Titipan';
import Kas from '@/pages/Kas';
import Laporan from '@/pages/Laporan';
import Pengaturan from '@/pages/Pengaturan';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#ffffff',
              color: '#1e293b',
              border: '1px solid #e2e8f0',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 500,
            },
            success: {
              iconTheme: {
                primary: '#059669',
                secondary: '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: '#e11d48',
                secondary: '#ffffff',
              },
            },
          }}
        />
        <Routes>
          {/* Public Route: Login */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes: Wajib Login */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="komoditas" element={<Komoditas />} />
            <Route path="kasir" element={<Kasir />} />
            <Route path="produk" element={<Produk />} />
            <Route path="pelanggan" element={<Pelanggan />} />
            <Route path="hutang" element={<Hutang />} />
            <Route path="titipan" element={<Titipan />} />
            <Route path="kas" element={<Kas />} />
            <Route path="laporan" element={<Laporan />} />
            <Route path="pengaturan" element={<Pengaturan />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
