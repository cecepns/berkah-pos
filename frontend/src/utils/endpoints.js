/**
 * Endpoint API Terpusat - Berkah POS
 * Wajib mengikuti aturan AGENTS.md
 */

export const API_ENDPOINTS = {
  HEALTH: '/health',

  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    PROFILE: '/auth/profile',
    DEMO_ACCOUNTS: '/auth/demo-accounts',
  },

  PENGATURAN: {
    DETAIL: '/pengaturan',
    UPDATE: '/pengaturan',
  },

  PELANGGAN: {
    LIST: '/pelanggan',
    DETAIL: (id) => `/pelanggan/${id}`,
    CREATE: '/pelanggan',
    UPDATE: (id) => `/pelanggan/${id}`,
    DELETE: (id) => `/pelanggan/${id}`,
  },

  PRODUK: {
    LIST: '/produk',
    DETAIL: (id) => `/produk/${id}`,
    CREATE: '/produk',
    UPDATE: (id) => `/produk/${id}`,
    DELETE: (id) => `/produk/${id}`,
  },

  TRANSAKSI_BELI: {
    LIST: '/transaksi-beli',
    CREATE: '/transaksi-beli',
    DELETE: (id) => `/transaksi-beli/${id}`,
  },

  TRANSAKSI_JUAL: {
    LIST: '/transaksi-jual',
    CREATE: '/transaksi-jual',
  },

  HUTANG: {
    LIST: '/hutang',
    CREATE: '/hutang',
  },

  PEMBAYARAN_HUTANG: {
    LIST: '/pembayaran-hutang',
    CREATE: '/pembayaran-hutang',
  },

  TITIPAN: {
    LIST: '/titipan',
    CREATE: '/titipan',
    PERBAIKI_SALDO: '/titipan/perbaiki-saldo',
  },

  KAS: {
    LIST: '/kas',
    CREATE: '/kas',
    UPDATE: (id) => `/kas/${id}`,
    DELETE: (id) => `/kas/${id}`,
  },

  LAPORAN: {
    RINGKASAN: '/laporan/ringkasan',
    PERIODIK: '/laporan/periodik',
  },

  USERS: {
    LIST: '/users',
    DETAIL: (id) => `/users/${id}`,
    CREATE: '/users',
    UPDATE: (id) => `/users/${id}`,
    DELETE: (id) => `/users/${id}`,
  },

  RESET: {
    TRANSAKSI: '/pengaturan/reset-transaksi',
    TOTAL: '/pengaturan/reset-total',
  },
};
