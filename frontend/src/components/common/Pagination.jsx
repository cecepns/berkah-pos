import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  limit = 10,
  onPageChange,
  onLimitChange,
}) {
  const limits = [10, 25, 50, 100];

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, totalItems);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxVisible - 1);
      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
      }
      for (let i = start; i <= end; i++) pages.push(i);
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3.5 px-2 text-xs text-slate-500">
      {/* Items count & Per Page Selector */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <span>
          Menampilkan <strong className="text-slate-900 font-bold">{startItem}</strong> -{' '}
          <strong className="text-slate-900 font-bold">{endItem}</strong> dari{' '}
          <strong className="text-slate-900 font-bold">{totalItems}</strong> data
        </span>

        {onLimitChange && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Baris:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none focus:border-emerald-500 shadow-2xs"
            >
              {limits.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Page Navigation */}
      <div className="flex items-center gap-1">
        {/* Prev Button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
          title="Halaman Sebelumnya"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page Numbers */}
        {pages.map((p) => {
          const isActive = p === currentPage;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`min-w-7 h-7 px-2 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                  : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs'
              }`}
            >
              {p}
            </button>
          );
        })}

        {/* Next Button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
          title="Halaman Berikutnya"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
