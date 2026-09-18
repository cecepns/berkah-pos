/**
 * Format helper utilities for Berkah POS
 */

export const formatRupiah = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
};

export const formatNumber = (val, decimals = 0) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

export const formatWeight = (val, satuan = 'kg') => {
  const num = Number(val) || 0;
  // If emas (gram), display 3 decimal places e.g. 2.350 gr
  if (satuan.toLowerCase().includes('gram') || satuan.toLowerCase().includes('gr')) {
    return `${formatNumber(num, 3)} gr`;
  }
  // Otherwise standard komoditas kg (up to 3 decimal places if fractional)
  return `${formatNumber(num, num % 1 !== 0 ? 3 : 0)} ${satuan}`;
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateStr;
  }
};

export const formatDateOnly = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
};

export const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://api.kingcreativestudio.my.id/berkah-pos';
  return `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
};
