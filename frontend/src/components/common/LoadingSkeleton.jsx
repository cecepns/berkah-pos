import React from 'react';

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="w-full animate-pulse">
      <div className="h-9 bg-slate-100 rounded-t-xl mb-2" />
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-11 bg-slate-50 border border-slate-100 rounded-lg flex items-center px-4 gap-4"
          >
            {Array.from({ length: cols }).map((_, j) => (
              <div
                key={j}
                className="h-3.5 bg-slate-200 rounded flex-1"
                style={{ width: `${60 + (j % 3) * 15}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-5 rounded-2xl bg-white border border-slate-200/90 animate-pulse space-y-3 shadow-sm"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-100" />
          <div className="h-3.5 w-24 bg-slate-200 rounded" />
          <div className="h-6 w-36 bg-slate-200 rounded" />
        </div>
      ))}
    </div>
  );
}
