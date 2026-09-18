import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export default function DebouncedSearch({
  value: initialValue = '',
  onChange,
  delay = 350,
  placeholder = 'Cari data...',
  className = '',
}) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (value !== initialValue) {
        onChange(value);
      }
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  const handleClear = () => {
    setValue('');
    onChange('');
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all shadow-2xs"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
          title="Hapus pencarian"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
