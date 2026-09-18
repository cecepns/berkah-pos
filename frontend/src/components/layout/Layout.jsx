import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './Sidebar';
import Header from './Header';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [storeInfo, setStoreInfo] = useState(null);

  const fetchStoreInfo = async () => {
    try {
      const res = await request.get(API_ENDPOINTS.PENGATURAN.DETAIL);
      if (res?.success && res?.data) {
        setStoreInfo(res.data);
      }
    } catch (err) {
      console.error('Gagal mengambil informasi toko:', err);
    }
  };

  useEffect(() => {
    fetchStoreInfo();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Clean Light Toast Notifications */}
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

      {/* Responsive Clean White Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        storeInfo={storeInfo}
      />

      {/* Main Wrapper with Sidebar Offset on Desktop */}
      <div className="lg:pl-72 flex flex-col flex-1 min-w-0">
        <Header
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          storeInfo={storeInfo}
        />

        {/* Dynamic Page Content with Clean Off-White / Pure White Canvas */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet context={{ storeInfo, refreshStoreInfo: fetchStoreInfo }} />
        </main>
      </div>
    </div>
  );
}
