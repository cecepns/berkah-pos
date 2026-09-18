import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CreditCard,
  Plus,
  Printer,
  History,
} from 'lucide-react';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import { formatRupiah, formatDate } from '@/utils/formatters';
import Modal from '@/components/common/Modal';
import DebouncedSearch from '@/components/common/DebouncedSearch';
import Pagination from '@/components/common/Pagination';
import EmptyState from '@/components/common/EmptyState';
import { TableSkeleton } from '@/components/common/LoadingSkeleton';
import ReceiptModal from '@/components/common/ReceiptModal';

export default function Hutang() {
  const { storeInfo } = useOutletContext();

  const [activeTab, setActiveTab] = useState('hutang');

  const [list, setList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [historyList, setHistoryList] = useState([]);
  const [historyPagination, setHistoryPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [historySearch, setHistorySearch] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [customers, setCustomers] = useState([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    pelanggan_id: '',
    tipe: 'kasbon_tunai',
    jumlah_hutang: '',
    jatuh_tempo: '',
    keterangan: '',
    tanggal: new Date().toISOString().split('T')[0],
  });

  const [isPayOpen, setIsPayOpen] = useState(false);
  const [payingHutang, setPayingHutang] = useState(null);
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payForm, setPayForm] = useState({
    jumlah_bayar: '',
    metode_bayar: 'tunai',
    catatan: '',
    tanggal: new Date().toISOString().split('T')[0],
  });

  const [receiptData, setReceiptData] = useState(null);

  const fetchHutang = async (page = pagination.page, limit = pagination.limit, q = search, st = statusFilter) => {
    setLoading(true);
    try {
      const res = await request.get(API_ENDPOINTS.HUTANG.LIST, {
        page,
        limit,
        search: q,
        status: st,
      });
      if (res?.success) {
        setList(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch {
      toast.error('Gagal mengambil daftar buku kasbon');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (page = historyPagination.page, limit = historyPagination.limit, q = historySearch) => {
    setLoadingHistory(true);
    try {
      const res = await request.get(API_ENDPOINTS.PEMBAYARAN_HUTANG.LIST, {
        page,
        limit,
        search: q,
      });
      if (res?.success) {
        setHistoryList(res.data || []);
        if (res.pagination) {
          setHistoryPagination(res.pagination);
        }
      }
    } catch {
      toast.error('Gagal mengambil riwayat pembayaran');
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await request.get(API_ENDPOINTS.PELANGGAN.LIST, { limit: 100 });
      if (res?.success) {
        setCustomers(res.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (activeTab === 'hutang') {
      fetchHutang(1, pagination.limit, search, statusFilter);
    } else {
      fetchHistory(1, historyPagination.limit, historySearch);
    }
  }, [activeTab, search, statusFilter, historySearch, pagination.limit, historyPagination.limit]);

  const openCreateModal = () => {
    setCreateForm({
      pelanggan_id: '',
      tipe: 'kasbon_tunai',
      jumlah_hutang: '',
      jatuh_tempo: '',
      keterangan: '',
      tanggal: new Date().toISOString().split('T')[0],
    });
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.pelanggan_id) {
      toast.error('Pilih mitra petani/pelanggan!');
      return;
    }
    if (Number(createForm.jumlah_hutang) <= 0) {
      toast.error('Jumlah kasbon wajib lebih dari 0!');
      return;
    }

    setCreateSubmitting(true);
    try {
      const payload = {
        kode_hutang: `HTG-${String(Date.now()).slice(-5)}`,
        pelanggan_id: Number(createForm.pelanggan_id),
        tipe: createForm.tipe,
        jumlah_hutang: Number(createForm.jumlah_hutang),
        jatuh_tempo: createForm.jatuh_tempo || null,
        keterangan: createForm.keterangan,
        tanggal: createForm.tanggal,
      };

      const res = await request.post(API_ENDPOINTS.HUTANG.CREATE, payload);
      if (res?.success) {
        toast.success('Kasbon berhasil dicatat!');
        setIsCreateOpen(false);
        fetchHutang(1, pagination.limit, search, statusFilter);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mencatat kasbon');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const openPayModal = (item) => {
    setPayingHutang(item);
    setPayForm({
      jumlah_bayar: String(item.sisa_hutang),
      metode_bayar: 'tunai',
      catatan: '',
      tanggal: new Date().toISOString().split('T')[0],
    });
    setIsPayOpen(true);
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (!payingHutang) return;

    const bayar = Number(payForm.jumlah_bayar);
    if (bayar <= 0) {
      toast.error('Jumlah bayar wajib lebih dari 0!');
      return;
    }
    if (bayar > Number(payingHutang.sisa_hutang)) {
      toast.error('Jumlah bayar tidak boleh melebihi sisa hutang!');
      return;
    }

    setPaySubmitting(true);
    try {
      const payload = {
        kode_bayar: `BYR-${String(Date.now()).slice(-5)}`,
        hutang_id: payingHutang.id,
        jumlah_bayar: bayar,
        metode_bayar: payForm.metode_bayar,
        catatan: payForm.catatan,
        tanggal: payForm.tanggal,
      };

      const res = await request.post(API_ENDPOINTS.PEMBAYARAN_HUTANG.CREATE, payload);
      if (res?.success) {
        toast.success('Pembayaran kasbon berhasil dicatat!');
        setIsPayOpen(false);
        fetchHutang(pagination.page, pagination.limit, search, statusFilter);

        setReceiptData({
          kode_bayar: payload.kode_bayar,
          nama_pelanggan: payingHutang.pelanggan_nama,
          sisa_sebelum: payingHutang.sisa_hutang,
          jumlah_bayar: bayar,
          sisa_sesudah: Number(payingHutang.sisa_hutang) - bayar,
          metode_bayar: payForm.metode_bayar,
          tanggal: payForm.tanggal,
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan pembayaran');
    } finally {
      setPaySubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-rose-600" />
            Buku Kasbon & Hutang Pelanggan
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pencatatan pinjaman operasional petani, bon toko, pelunasan bertahap, dan potong hasil panen.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Kasbon Baru</span>
        </button>
      </div>

      {/* Main Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('hutang')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'hutang'
              ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Buku Kasbon / Piutang Berjalan</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('riwayat')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'riwayat'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Riwayat Pembayaran Kasbon</span>
        </button>
      </div>

      {/* Content for Tab: Hutang */}
      {activeTab === 'hutang' && (
        <div className="space-y-4">
          {/* Status Filter & Search */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
              {[
                { id: '', label: 'Semua Status' },
                { id: 'belum_lunas', label: 'Belum Lunas' },
                { id: 'sebagian', label: 'Sebagian' },
                { id: 'lunas', label: 'Lunas' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    statusFilter === st.id
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <div className="w-full md:w-72">
              <DebouncedSearch
                value={search}
                onChange={(val) => setSearch(val)}
                placeholder="Cari nama mitra / kode kasbon..."
              />
            </div>
          </div>

          {/* Table Hutang */}
          <div className="rounded-2xl bg-white border border-slate-200/90 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-4">Kode & Tanggal</th>
                    <th className="py-3.5 px-4">Mitra / Petani</th>
                    <th className="py-3.5 px-4">Tipe Kasbon</th>
                    <th className="py-3.5 px-4 text-right">Total Pinjaman</th>
                    <th className="py-3.5 px-4 text-right">Sisa Hutang</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-center">Aksi Bayar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-6">
                        <TableSkeleton rows={5} cols={7} />
                      </td>
                    </tr>
                  ) : list.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <EmptyState
                          title="Tidak Ada Data Kasbon"
                          description="Semua kasbon telah lunas atau belum ada catatan baru."
                          actionLabel="Catat Kasbon Baru"
                          onAction={openCreateModal}
                        />
                      </td>
                    </tr>
                  ) : (
                    list.map((item) => {
                      const isLunas = item.status === 'lunas';
                      const isSebagian = item.status === 'sebagian';

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-mono-num font-semibold text-slate-800">
                              {item.kode_hutang}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {formatDate(item.tanggal)}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{item.pelanggan_nama}</div>
                            {item.keterangan && (
                              <div className="text-[11px] text-slate-400 truncate max-w-xs">
                                {item.keterangan}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="capitalize px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">
                              {item.tipe === 'kasbon_tunai' ? 'Kasbon Tunai' : 'Bon Belanja POS'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono-num text-slate-600">
                            {formatRupiah(item.jumlah_hutang)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono-num font-bold text-rose-600">
                            {formatRupiah(item.sisa_hutang)}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                isLunas
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : isSebagian
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {isLunas ? 'Lunas' : isSebagian ? 'Sebagian' : 'Belum Lunas'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {!isLunas ? (
                              <button
                                type="button"
                                onClick={() => openPayModal(item)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                              >
                                Bayar Kasbon
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400 font-semibold">Tuntas</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-100 px-4">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                totalItems={pagination.total}
                limit={pagination.limit}
                onPageChange={(p) => fetchHutang(p, pagination.limit, search, statusFilter)}
                onLimitChange={(l) => {
                  setPagination((prev) => ({ ...prev, limit: l }));
                  fetchHutang(1, l, search, statusFilter);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Content for Tab: Riwayat Pembayaran */}
      {activeTab === 'riwayat' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900">Log Transaksi Pembayaran Kasbon</h3>
            <div className="w-72">
              <DebouncedSearch
                value={historySearch}
                onChange={(val) => setHistorySearch(val)}
                placeholder="Cari kode bayar / nama mitra..."
              />
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200/90 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-4">Kode & Tanggal</th>
                    <th className="py-3.5 px-4">Mitra</th>
                    <th className="py-3.5 px-4 text-right">Jumlah Dibayar</th>
                    <th className="py-3.5 px-4 text-right">Sisa Sebelum</th>
                    <th className="py-3.5 px-4 text-right">Sisa Sesudah</th>
                    <th className="py-3.5 px-4">Metode Bayar</th>
                    <th className="py-3.5 px-4 text-center">Cetak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingHistory ? (
                    <tr>
                      <td colSpan={7} className="p-6">
                        <TableSkeleton rows={5} cols={7} />
                      </td>
                    </tr>
                  ) : historyList.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <EmptyState
                          title="Belum Ada Riwayat Bayar"
                          description="Belum ada catatan pembayaran kasbon."
                        />
                      </td>
                    </tr>
                  ) : (
                    historyList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-mono-num font-semibold text-slate-800">
                            {item.kode_bayar}
                          </div>
                          <div className="text-[11px] text-slate-500">{formatDate(item.tanggal)}</div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{item.pelanggan_nama}</td>
                        <td className="py-3.5 px-4 text-right font-mono-num font-black text-emerald-700">
                          {formatRupiah(item.jumlah_bayar)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono-num text-slate-500">
                          {formatRupiah(item.sisa_sebelum)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono-num font-semibold text-rose-600">
                          {formatRupiah(item.sisa_sesudah)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="uppercase text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {item.metode_bayar?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setReceiptData({
                                kode_bayar: item.kode_bayar,
                                nama_pelanggan: item.pelanggan_nama,
                                sisa_sebelum: item.sisa_sebelum,
                                jumlah_bayar: item.jumlah_bayar,
                                sisa_sesudah: item.sisa_sesudah,
                                metode_bayar: item.metode_bayar,
                                tanggal: item.tanggal,
                              })
                            }
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-100 px-4">
              <Pagination
                currentPage={historyPagination.page}
                totalPages={historyPagination.totalPages}
                totalItems={historyPagination.total}
                limit={historyPagination.limit}
                onPageChange={(p) => fetchHistory(p, historyPagination.limit, historySearch)}
                onLimitChange={(l) => {
                  setHistoryPagination((prev) => ({ ...prev, limit: l }));
                  fetchHistory(1, l, historySearch);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal: Catat Kasbon Baru */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => !createSubmitting && setIsCreateOpen(false)}
        title="Catat Kasbon / Bon Baru"
        subtitle="Berikan pinjaman kasbon atau bon belanja kepada mitra petani"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pilih Mitra Petani / Pelanggan <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={createForm.pelanggan_id}
              onChange={(e) => setCreateForm({ ...createForm, pelanggan_id: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-rose-500"
            >
              <option value="">-- Pilih Mitra --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.kode} - {c.nama} ({c.kategori})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tipe Kasbon</label>
              <select
                value={createForm.tipe}
                onChange={(e) => setCreateForm({ ...createForm, tipe: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-rose-500"
              >
                <option value="kasbon_tunai">Kasbon Tunai (Pinjaman)</option>
                <option value="bon_belanja">Bon Belanja Barang</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Kasbon
              </label>
              <input
                type="date"
                value={createForm.tanggal}
                onChange={(e) => setCreateForm({ ...createForm, tanggal: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Jumlah Kasbon (Rp) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              required
              placeholder="0"
              value={createForm.jumlah_hutang}
              onChange={(e) => setCreateForm({ ...createForm, jumlah_hutang: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold font-mono-num text-rose-600 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Jatuh Tempo (Opsional)
            </label>
            <input
              type="date"
              value={createForm.jatuh_tempo}
              onChange={(e) => setCreateForm({ ...createForm, jatuh_tempo: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan</label>
            <textarea
              rows={2}
              value={createForm.keterangan}
              onChange={(e) => setCreateForm({ ...createForm, keterangan: e.target.value })}
              placeholder="Misal: Uang jalan angkutan sawit, pupuk 1 sak..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={createSubmitting}
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={createSubmitting}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm flex items-center gap-2"
            >
              {createSubmitting && (
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              )}
              <span>Catat Kasbon</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Bayar Hutang */}
      <Modal
        isOpen={isPayOpen}
        onClose={() => !paySubmitting && setIsPayOpen(false)}
        title="Pembayaran Kasbon / Hutang"
        subtitle={`Pembayaran kasbon untuk ${payingHutang?.pelanggan_nama}`}
        maxWidth="max-w-md"
      >
        {payingHutang && (
          <form onSubmit={handlePaySubmit} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <div className="text-slate-500">Total Pinjaman:</div>
                <div className="font-mono-num font-semibold text-slate-900">
                  {formatRupiah(payingHutang.jumlah_hutang)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-slate-500">Sisa Hutang:</div>
                <div className="font-mono-num font-black text-rose-600 text-sm">
                  {formatRupiah(payingHutang.sisa_hutang)}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jumlah yang Dibayarkan (Rp) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                value={payForm.jumlah_bayar}
                onChange={(e) => setPayForm({ ...payForm, jumlah_bayar: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-black font-mono-num text-emerald-700 focus:outline-none focus:border-emerald-500"
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setPayForm({ ...payForm, jumlah_bayar: String(payingHutang.sisa_hutang) })}
                  className="px-2.5 py-1 rounded bg-slate-100 text-[10px] font-bold text-slate-700 hover:bg-slate-200"
                >
                  Lunasi Semua ({formatRupiah(payingHutang.sisa_hutang)})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Metode Pembayaran
                </label>
                <select
                  value={payForm.metode_bayar}
                  onChange={(e) => setPayForm({ ...payForm, metode_bayar: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  <option value="tunai">Tunai</option>
                  <option value="transfer">Transfer Bank</option>
                  <option value="potong_hasil_komoditas">Potong Hasil Timbang</option>
                  <option value="saldo_titipan">Potong Saldo Tabungan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal Bayar
                </label>
                <input
                  type="date"
                  value={payForm.tanggal}
                  onChange={(e) => setPayForm({ ...payForm, tanggal: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan</label>
              <input
                type="text"
                value={payForm.catatan}
                onChange={(e) => setPayForm({ ...payForm, catatan: e.target.value })}
                placeholder="Cicilan 1, titip lewat sopir..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={paySubmitting}
                onClick={() => setIsPayOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={paySubmitting}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-2"
              >
                {paySubmitting && (
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                )}
                <span>Simpan & Cetak Kuitansi</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={Boolean(receiptData)}
        onClose={() => setReceiptData(null)}
        data={receiptData}
        type="hutang"
        storeInfo={storeInfo}
      />
    </div>
  );
}
