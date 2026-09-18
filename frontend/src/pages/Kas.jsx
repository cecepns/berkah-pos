import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Calendar,
  Plus,
  Minus,
  Edit2,
  Trash2,
  Filter,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import { formatRupiah, formatDate } from '@/utils/formatters';
import Modal from '@/components/common/Modal';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import DebouncedSearch from '@/components/common/DebouncedSearch';
import Pagination from '@/components/common/Pagination';
import EmptyState from '@/components/common/EmptyState';
import { TableSkeleton, CardSkeleton } from '@/components/common/LoadingSkeleton';

const KATEGORI_MASUK = [
  'Modal Awal',
  'Tambah Modal',
  'Setoran Kasir',
  'Pendapatan Lain',
  'Pengembalian Pinjaman',
  'Pemasukan Lain-lain',
];

const KATEGORI_KELUAR = [
  'Operasional Toko',
  'Bensin & Angkutan',
  'Listrik, Air & Internet',
  'Gaji & Upah Karyawan',
  'Konsumsi & Makan',
  'Beli Perlengkapan',
  'Perbaikan & Servis',
  'Prive / Tarik Kas Pemilik',
  'Pengeluaran Lain-lain',
];

export default function Kas() {
  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const [list, setList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [summary, setSummary] = useState({
    saldo_kas: 0,
    total_masuk: 0,
    total_keluar: 0,
    kas_hari_ini: { masuk: 0, keluar: 0, selisih: 0 },
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [tipeFilter, setTipeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal Create / Edit State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [form, setForm] = useState({
    tipe: 'masuk',
    kategori: 'Modal Awal',
    jumlah: '',
    keterangan: '',
    tanggal: today,
  });

  // Delete State
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchKas = async (
    page = pagination.page,
    limit = pagination.limit,
    q = search,
    t = tipeFilter,
    sDate = startDate,
    eDate = endDate
  ) => {
    setLoading(true);
    try {
      const res = await request.get(API_ENDPOINTS.KAS.LIST, {
        page,
        limit,
        search: q,
        tipe: t,
        startDate: sDate,
        endDate: eDate,
      });

      if (res?.success) {
        setList(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
        if (res.summary) {
          setSummary(res.summary);
        }
      }
    } catch {
      toast.error('Gagal mengambil data buku kas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKas(1, pagination.limit, search, tipeFilter, startDate, endDate);
  }, [search, tipeFilter, startDate, endDate]);

  const setRangeQuick = (type) => {
    const d = new Date();
    if (type === 'hari_ini') {
      const t = d.toISOString().split('T')[0];
      setStartDate(t);
      setEndDate(t);
    } else if (type === '7_hari') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(today);
    } else if (type === 'bulan_ini') {
      setStartDate(firstDayOfMonth);
      setEndDate(today);
    } else if (type === 'semua') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Open Create Modal
  const openCreateModal = (tipe = 'masuk') => {
    setModalMode('create');
    setEditingId(null);
    setForm({
      tipe,
      kategori: tipe === 'masuk' ? KATEGORI_MASUK[0] : KATEGORI_KELUAR[0],
      jumlah: '',
      keterangan: '',
      tanggal: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (item) => {
    setModalMode('edit');
    setEditingId(item.id);
    setForm({
      tipe: item.tipe,
      kategori: item.kategori,
      jumlah: String(item.jumlah),
      keterangan: item.keterangan || '',
      tanggal: item.tanggal ? item.tanggal.split('T')[0] : today,
    });
    setIsModalOpen(true);
  };

  // Submit Form (Create / Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    const nominal = parseFloat(form.jumlah);
    if (!nominal || nominal <= 0) {
      toast.error('Jumlah uang kas wajib lebih dari 0!');
      return;
    }
    if (!form.kategori.trim()) {
      toast.error('Kategori transaksi kas wajib dipilih/diisi!');
      return;
    }

    setFormSubmitting(true);
    try {
      const payload = {
        tipe: form.tipe,
        kategori: form.kategori.trim(),
        jumlah: nominal,
        keterangan: form.keterangan,
        tanggal: form.tanggal,
      };

      let res;
      if (modalMode === 'create') {
        res = await request.post(API_ENDPOINTS.KAS.CREATE, payload);
      } else {
        res = await request.put(API_ENDPOINTS.KAS.UPDATE(editingId), payload);
      }

      if (res?.success) {
        toast.success(
          modalMode === 'create'
            ? `Kas ${form.tipe} berhasil dicatat!`
            : 'Transaksi kas berhasil diperbarui!'
        );
        setIsModalOpen(false);
        fetchKas(pagination.page, pagination.limit, search, tipeFilter, startDate, endDate);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan transaksi kas');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      const res = await request.delete(API_ENDPOINTS.KAS.DELETE(deleteId));
      if (res?.success) {
        toast.success('Transaksi kas berhasil dihapus');
        setDeleteId(null);
        fetchKas(pagination.page, pagination.limit, search, tipeFilter, startDate, endDate);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus transaksi kas');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Banknote className="w-6 h-6 text-emerald-600" />
            Buku Uang Kas Toko
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pencatatan kas masuk (modal/setoran), kas keluar operasional, dan rekonsiliasi saldo kas riil toko.
          </p>
        </div>

        {/* Action Buttons: Kas Masuk & Kas Keluar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => openCreateModal('keluar')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs sm:text-sm transition-all shadow-2xs"
          >
            <Minus className="w-4 h-4 text-rose-600" />
            <span>- Catat Kas Keluar</span>
          </button>

          <button
            type="button"
            onClick={() => openCreateModal('masuk')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ Catat Kas Masuk</span>
          </button>
        </div>
      </div>

      {/* 4 Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Saldo Kas Riil di Laci */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">
              Saldo Kas di Laci Toko
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-black font-mono-num mb-1 ${
              summary.saldo_kas >= 0 ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {formatRupiah(summary.saldo_kas)}
          </div>
          <div className="text-[11px] text-slate-400">
            Total Kas Masuk dikurangi Kas Keluar
          </div>
        </div>

        {/* Card 2: Total Kas Masuk */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">
              Total Kas Masuk
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono-num mb-1">
            {formatRupiah(summary.total_masuk)}
          </div>
          <div className="text-[11px] text-slate-400">
            Modal awal, setoran & pemasukan
          </div>
        </div>

        {/* Card 3: Total Kas Keluar */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">
              Total Kas Keluar
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 font-mono-num mb-1">
            {formatRupiah(summary.total_keluar)}
          </div>
          <div className="text-[11px] text-slate-400">
            Operasional, bensin, listrik & prive
          </div>
        </div>

        {/* Card 4: Kas Hari Ini */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">
              Arus Kas Hari Ini
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-black font-mono-num mb-1 ${
              summary.kas_hari_ini?.selisih >= 0 ? 'text-blue-600' : 'text-rose-600'
            }`}
          >
            {formatRupiah(summary.kas_hari_ini?.selisih || 0)}
          </div>
          <div className="text-[11px] text-slate-400">
            Masuk: +{formatRupiah(summary.kas_hari_ini?.masuk || 0)} | Keluar: -{formatRupiah(summary.kas_hari_ini?.keluar || 0)}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Realtime Debounced Search */}
          <div className="flex-1 max-w-md">
            <DebouncedSearch
              value={search}
              onChange={(val) => setSearch(val)}
              placeholder="Cari kode transaksi, kategori, atau keterangan..."
            />
          </div>

          {/* Tipe Selector Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl flex-shrink-0">
            {[
              { id: '', label: 'Semua Tipe' },
              { id: 'masuk', label: 'Kas Masuk (+)' },
              { id: 'keluar', label: 'Kas Keluar (-)' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTipeFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  tipeFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Filter Toolbar */}
        <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
            <button
              type="button"
              onClick={() => setRangeQuick('hari_ini')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition-colors whitespace-nowrap"
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => setRangeQuick('7_hari')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition-colors whitespace-nowrap"
            >
              7 Hari
            </button>
            <button
              type="button"
              onClick={() => setRangeQuick('bulan_ini')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition-colors whitespace-nowrap"
            >
              Bulan Ini
            </button>
            <button
              type="button"
              onClick={() => setRangeQuick('semua')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition-colors whitespace-nowrap"
            >
              Semua Waktu
            </button>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>Dari:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono-num"
              />
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <span>S/d:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono-num"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Riwayat Transaksi Buku Kas
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-semibold px-2.5 py-0.5 rounded-full bg-slate-100">
            {pagination.total} Catatan
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">No</th>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Kode Transaksi</th>
                <th className="py-3 px-4">Tipe</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Keterangan</th>
                <th className="py-3 px-4 text-right">Jumlah (Rp)</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-6">
                    <TableSkeleton rows={5} cols={8} />
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      title="Belum Ada Transaksi Kas"
                      description="Catat kas masuk atau kas keluar operasional untuk memulai pembukuan uang kas."
                      actionLabel="+ Catat Kas Sekarang"
                      onAction={() => openCreateModal('masuk')}
                    />
                  </td>
                </tr>
              ) : (
                list.map((item, idx) => {
                  const isMasuk = item.tipe === 'masuk';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-slate-400 font-mono-num">
                        {(pagination.page - 1) * pagination.limit + idx + 1}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                        {formatDate(item.tanggal)}
                      </td>
                      <td className="py-3.5 px-4 font-mono-num font-semibold text-slate-800">
                        {item.kode_transaksi}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                            isMasuk
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isMasuk ? (
                            <ArrowDownRight className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3 text-rose-600" />
                          )}
                          Kas {item.tipe}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {item.kategori}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                        {item.keterangan || '-'}
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right font-mono-num font-black whitespace-nowrap ${
                          isMasuk ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {isMasuk ? '+' : '-'} {formatRupiah(item.jumlah)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
                            title="Edit Transaksi"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteId(item.id)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors"
                            title="Hapus Transaksi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server-side Pagination Component */}
        <div className="border-t border-slate-100 px-4">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            limit={pagination.limit}
            onPageChange={(p) =>
              fetchKas(p, pagination.limit, search, tipeFilter, startDate, endDate)
            }
            onLimitChange={(l) => {
              setPagination((prev) => ({ ...prev, limit: l }));
              fetchKas(1, l, search, tipeFilter, startDate, endDate);
            }}
          />
        </div>
      </div>

      {/* Modal: Catat Kas Masuk / Kas Keluar */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !formSubmitting && setIsModalOpen(false)}
        title={
          modalMode === 'create'
            ? form.tipe === 'masuk'
              ? 'Catat Kas Masuk'
              : 'Catat Kas Keluar / Biaya'
            : 'Edit Transaksi Kas'
        }
        subtitle="Pencatatan arus kas uang toko secara rapi dan akuntabel"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipe Selector in Modal */}
          {modalMode === 'create' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Jenis Arus Kas
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      tipe: 'masuk',
                      kategori: KATEGORI_MASUK[0],
                    }));
                  }}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    form.tipe === 'masuk'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <ArrowDownRight className="w-4 h-4" />
                  <span>Kas Masuk (+)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      tipe: 'keluar',
                      kategori: KATEGORI_KELUAR[0],
                    }));
                  }}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    form.tipe === 'keluar'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Kas Keluar (-)</span>
                </button>
              </div>
            </div>
          )}

          {/* Kategori Dropdown / Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kategori Transaksi <span className="text-rose-500">*</span>
            </label>
            <select
              value={form.kategori}
              onChange={(e) => setForm({ ...form, kategori: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:border-emerald-500 focus:outline-none font-medium"
            >
              {(form.tipe === 'masuk' ? KATEGORI_MASUK : KATEGORI_KELUAR).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Jumlah Nominal */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Jumlah Uang (Rp) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">
                Rp
              </span>
              <input
                type="number"
                min="1"
                required
                value={form.jumlah}
                onChange={(e) => setForm({ ...form, jumlah: e.target.value })}
                placeholder="Contoh: 500000"
                className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-black font-mono-num text-slate-900 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            {Number(form.jumlah) > 0 && (
              <div className="mt-1 text-right text-xs font-bold text-emerald-700 font-mono-num">
                {formatRupiah(form.jumlah)}
              </div>
            )}
          </div>

          {/* Tanggal */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tanggal Transaksi <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={form.tanggal}
              onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:border-emerald-500 focus:outline-none font-mono-num"
            />
          </div>

          {/* Keterangan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Keterangan / Catatan
            </label>
            <textarea
              rows={2}
              value={form.keterangan}
              onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
              placeholder="Rincian penggunaan kas atau sumber pemasukan..."
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={formSubmitting}
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all ${
                form.tipe === 'masuk'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              } disabled:opacity-50`}
            >
              {formSubmitting
                ? 'Menyimpan...'
                : modalMode === 'create'
                ? form.tipe === 'masuk'
                  ? 'Simpan Kas Masuk'
                  : 'Simpan Kas Keluar'
                : 'Perbarui Transaksi'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Transaksi Kas"
        message="Apakah Anda yakin ingin menghapus catatan transaksi kas ini? Saldo kas akan otomatis diperhitungkan ulang."
        confirmText="Ya, Hapus"
        cancelText="Batal"
        loading={deleteLoading}
      />
    </div>
  );
}
