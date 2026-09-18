import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Scale,
  ShoppingCart,
  Package,
  Users,
  CreditCard,
  Wallet,
  BarChart3,
  Settings,
  X,
  LogOut,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/komoditas', label: 'Beli Komoditas', icon: Scale, badge: 'Emas/Sawit' },
  { to: '/kasir', label: 'Kasir POS Toko', icon: ShoppingCart },
  { to: '/produk', label: 'Data Produk', icon: Package },
  { to: '/pelanggan', label: 'Pelanggan & Petani', icon: Users },
  { to: '/hutang', label: 'Buku Hutang', icon: CreditCard },
  { to: '/titipan', label: 'Tabungan Titipan', icon: Wallet },
  { to: '/laporan', label: 'Laporan & Rekap', icon: BarChart3 },
  { to: '/pengaturan', label: 'Pengaturan', icon: Settings },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (window.innerWidth < 1024) onClose();
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200/90 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Header Branding */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-slate-900 text-base leading-tight">
                Berkah <span className="text-emerald-600">POS</span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium">Kasir & Komoditas</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg lg:hidden"
            title="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4.5 h-4.5" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        {user && (
          <div className="p-3 mx-3 mb-2 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {user.nama?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {user.nama}
                  </div>
                  <div className="text-[10px] text-slate-400 capitalize">
                    {user.role} • {user.username}
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200/60 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar Akun</span>
            </button>
          </div>
        )}

        {/* Footer info */}
        <div className="px-4 py-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
          <span>v1.0.0 • Berkah POS</span>
          <span className="text-emerald-600 font-semibold">PWA Siap</span>
        </div>
      </aside>
    </>
  );
}
