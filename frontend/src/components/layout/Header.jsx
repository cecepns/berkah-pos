import React, { useState, useEffect } from 'react';
import { Menu, Scale, ShoppingCart, Clock, LogOut, User as UserIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function Header({ onToggleSidebar, storeInfo }) {
  const [time, setTime] = useState(new Date());
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = time.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const formattedDate = time.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 h-14 sm:h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/90 flex items-center justify-between px-3 sm:px-6 shadow-2xs">
      {/* Left: Hamburger & Store Branding */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 lg:hidden transition-colors flex-shrink-0"
          title="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="text-[10px] sm:text-xs text-slate-400 font-medium truncate hidden xs:block">
            Kasir & Komoditas
          </div>
          <div className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight truncate">
            {storeInfo?.nama_toko || 'Berkah POS'}
          </div>
        </div>
      </div>

      {/* Right: Clock, Shortcuts & User Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
        {/* Clock on Tablet / Desktop */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700">
          <Clock className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-mono-num font-semibold">{formattedTime}</span>
          <span className="text-slate-400">•</span>
          <span>{formattedDate}</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 ml-0.5" title="Online" />
        </div>

        {/* Beli Komoditas Shortcut */}
        <Link
          to="/komoditas"
          className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-2xs transition-all whitespace-nowrap"
          title="Beli Komoditas"
        >
          <Scale className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Komoditas</span>
        </Link>

        {/* Kasir POS Shortcut */}
        <Link
          to="/kasir"
          className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all whitespace-nowrap"
          title="Kasir POS Toko"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Kasir POS</span>
        </Link>

        {/* User Pill & Quick Logout */}
        {user && (
          <div className="flex items-center gap-1 pl-1 sm:pl-2 border-l border-slate-200">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[100px]">
                {user.nama}
              </span>
              <span className="text-[10px] font-semibold text-emerald-600 capitalize">
                {user.role}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Keluar / Logout"
              className="p-1.5 sm:p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

