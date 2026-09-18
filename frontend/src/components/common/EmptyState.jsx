import React from 'react';
import { PackageOpen } from 'lucide-react';

export default function EmptyState({
  icon: Icon = PackageOpen,
  title = 'Tidak Ada Data',
  description = 'Belum ada data yang tersedia untuk kriteria ini.',
  actionLabel,
  onAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-400 mb-3 shadow-2xs">
        <Icon className="w-7 h-7" />
      </div>
      <h4 className="text-sm font-bold text-slate-800 mb-1">{title}</h4>
      <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
