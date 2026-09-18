import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Scale,
  Plus,
  Trash2,
  Printer,
  ArrowRightLeft,
} from 'lucide-react';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import { formatRupiah, formatWeight, formatDate } from '@/utils/formatters';
import Modal from '@/components/common/Modal';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import DebouncedSearch from '@/components/common/DebouncedSearch';
import Pagination from '@/components/common/Pagination';
import EmptyState from '@/components/common/EmptyState';
import { TableSkeleton } from '@/components/common/LoadingSkeleton';
import ReceiptModal from '@/components/common/ReceiptModal';

export default function Komoditas() {
  const { storeInfo } = useOutletContext();

  // List State
  const [list, setList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [selectedKomoditas, setSelectedKomoditas] = useState('');
  const [loading, setLoading] = useState(true);

  // Pelanggan Mitra list for select
  const [pelangganList, setPelangganList] = useState([]);

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Form Fields
  const [form, setForm] = useState({
    pelanggan_id: '',
    nama_pelanggan: '',
    jenis_komoditas: 'sawit',
    berat_kotor: '',
    potongan_persen: '0',
    potongan_nilai: '0',
    satuan: 'kg',
    kadar: 'TBS Matang',
    harga_satuan: '',
    biaya_lain: '0',
    metode_bayar: 'tunai',
    jumlah_potong_hutang: '0',
    jumlah_masuk_titipan: '0',
    catatan: '',
    tanggal: new Date().toISOString().split('T')[0],
  });

  // Selected customer object for viewing balance
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Delete Dialog State
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Receipt Modal State
  const [receiptData, setReceiptData] = useState(null);

  // Fetch list
  const fetchTransactions = async (page = pagination.page, limit = pagination.limit, q = search, kom = selectedKomoditas) => {
    setLoading(true);
    try {
      const res = await request.get(API_ENDPOINTS.TRANSAKSI_BELI.LIST, {
        page,
        limit,
        search: q,
        jenis_komoditas: kom,
      });

      if (res?.success) {
        setList(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      toast.error('Gagal mengambil data transaksi pembelian');
    } finally {
      setLoading(false);
    }
  };

  // Fetch pelanggan for dropdown
  const fetchPelanggan = async () => {
    try {
      const res = await request.get(API_ENDPOINTS.PELANGGAN.LIST, { limit: 100 });
      if (res?.success) {
        setPelangganList(res.data || []);
      }
    } catch (err) {
      console.error('Gagal mengambil list pelanggan:', err);
    }
  };

  useEffect(() => {
    fetchTransactions(1, pagination.limit, search, selectedKomoditas);
  }, [search, selectedKomoditas]);

  useEffect(() => {
    fetchPelanggan();
  }, []);

  // Set default price when commodity changes
  const handleCommodityTypeChange = (type) => {
    let defPrice = 0;
    let defSatuan = 'kg';
    let defKadar = '';

    if (type === 'emas') {
      defPrice = storeInfo?.harga_emas_24k || 1350000;
      defSatuan = 'gram';
      defKadar = '22K (70%)';
    } else if (type === 'sawit') {
      defPrice = storeInfo?.harga_sawit_kg || 2650;
      defSatuan = 'kg';
      defKadar = 'TBS Matang';
    } else if (type === 'karet') {
      defPrice = storeInfo?.harga_karet_kg || 11500;
      defSatuan = 'kg';
      defKadar = 'Kadar 50-60% DRC';
    }

    setForm((prev) => ({
      ...prev,
      jenis_komoditas: type,
      satuan: defSatuan,
      kadar: defKadar,
      harga_satuan: String(defPrice),
      berat_kotor: '',
      potongan_persen: '0',
      potongan_nilai: '0',
    }));
  };

  // Open Create Modal
  const openCreateModal = () => {
    let defPrice = storeInfo?.harga_sawit_kg || 2650;
    setForm({
      pelanggan_id: '',
      nama_pelanggan: '',
      jenis_komoditas: 'sawit',
      berat_kotor: '',
      potongan_persen: '0',
      potongan_nilai: '0',
      satuan: 'kg',
      kadar: 'TBS Matang',
      harga_satuan: String(defPrice),
      biaya_lain: '0',
      metode_bayar: 'tunai',
      jumlah_potong_hutang: '0',
      jumlah_masuk_titipan: '0',
      catatan: '',
      tanggal: new Date().toISOString().split('T')[0],
    });
    setSelectedCustomer(null);
    setIsCreateOpen(true);
  };

  // When customer is selected
  const handleSelectCustomer = (e) => {
    const custId = e.target.value;
    if (!custId) {
      setSelectedCustomer(null);
      setForm((prev) => ({ ...prev, pelanggan_id: '', nama_pelanggan: '' }));
      return;
    }
    const found = pelangganList.find((c) => String(c.id) === String(custId));
    if (found) {
      setSelectedCustomer(found);
      setForm((prev) => ({
        ...prev,
        pelanggan_id: found.id,
        nama_pelanggan: found.nama,
      }));
    }
  };

  // Computations
  const bruto = Number(form.berat_kotor) || 0;
  const pct = Number(form.potongan_persen) || 0;
  let potVal = Number(form.potongan_nilai) || 0;

  if (pct > 0 && bruto > 0) {
    potVal = Number(((bruto * pct) / 100).toFixed(3));
  }
  const netto = Math.max(0, bruto - potVal);
  const harga = Number(form.harga_satuan) || 0;
  const subtotal = Math.round(netto * harga);
  const biayaLain = Number(form.biaya_lain) || 0;
  const totalBayar = Math.max(0, subtotal - biayaLain);

  // Handle Submit Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nama_pelanggan.trim()) {
      toast.error('Nama pelanggan / petani wajib diisi!');
      return;
    }
    if (bruto <= 0) {
      toast.error('Berat kotor wajib lebih dari 0!');
      return;
    }
    if (harga <= 0) {
      toast.error('Harga satuan wajib diisi!');
      return;
    }

    setFormSubmitting(true);
    try {
      const payload = {
        pelanggan_id: form.pelanggan_id || null,
        nama_pelanggan: form.nama_pelanggan,
        jenis_komoditas: form.jenis_komoditas,
        berat_kotor: bruto,
        potongan_persen: pct,
        potongan_nilai: potVal,
        berat_bersih: netto,
        satuan: form.satuan,
        kadar: form.kadar,
        harga_satuan: harga,
        subtotal,
        biaya_lain: biayaLain,
        total_bayar: totalBayar,
        metode_bayar: form.metode_bayar,
        jumlah_potong_hutang:
          form.metode_bayar === 'potong_hutang'
            ? Math.min(totalBayar, Number(form.jumlah_potong_hutang) || totalBayar)
            : 0,
        jumlah_masuk_titipan:
          form.metode_bayar === 'masuk_titipan'
            ? Math.min(totalBayar, Number(form.jumlah_masuk_titipan) || totalBayar)
            : 0,
        catatan: form.catatan,
        tanggal: form.tanggal,
      };

      const res = await request.post(API_ENDPOINTS.TRANSAKSI_BELI.CREATE, payload);
      if (res?.success) {
        toast.success('Transaksi pembelian berhasil dicatat!');
        setIsCreateOpen(false);
        fetchTransactions(1, pagination.limit, search, selectedKomoditas);
        fetchPelanggan();

        // Open receipt modal
        setReceiptData({
          ...payload,
          no_nota: res.data?.no_nota || 'NOT-B-Baru',
          created_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal menyimpan transaksi pembelian';
      toast.error(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      const res = await request.delete(API_ENDPOINTS.TRANSAKSI_BELI.DELETE(deleteId));
      if (res?.success) {
        toast.success('Transaksi berhasil dihapus');
        setDeleteId(null);
        fetchTransactions(pagination.page, pagination.limit, search, selectedKomoditas);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus transaksi');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Scale className="w-6 h-6 text-amber-500" />
            Pembelian Komoditas (Emas, Sawit, Karet)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Penimbangan hasil bumi dan emas presisi, hitung potongan otomatis, potong kasbon, dan cetak nota.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Timbang & Beli Baru</span>
        </button>
      </div>

      {/* Filters & Search Row */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Commodity Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200/80 w-full md:w-auto overflow-x-auto">
          {[
            { id: '', label: 'Semua Komoditas' },
            { id: 'sawit', label: '🌾 Sawit (kg)' },
            { id: 'karet', label: '🌳 Karet (kg)' },
            { id: 'emas', label: '🪙 Emas (gram)' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedKomoditas(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedKomoditas === tab.id
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Realtime Debounced Search */}
        <div className="w-full md:w-72">
          <DebouncedSearch
            value={search}
            onChange={(val) => setSearch(val)}
            placeholder="Cari no nota / mitra..."
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl bg-white border border-slate-200/90 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">No. Nota</th>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Mitra / Petani</th>
                <th className="py-3 px-4">Komoditas</th>
                <th className="py-3 px-4 text-right">Berat Bersih</th>
                <th className="py-3 px-4 text-right">Harga Satuan</th>
                <th className="py-3 px-4 text-right">Total Bayar</th>
                <th className="py-3 px-4">Metode</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-6">
                    <TableSkeleton rows={5} cols={9} />
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <EmptyState
                      title="Belum Ada Transaksi Pembelian"
                      description="Belum ada data pembelian komoditas yang dicatat. Klik tombol di bawah untuk mulai menimbang."
                      actionLabel="Timbang & Beli Baru"
                      onAction={openCreateModal}
                    />
                  </td>
                </tr>
              ) : (
                list.map((item) => {
                  const isEmas = item.jenis_komoditas === 'emas';
                  const isSawit = item.jenis_komoditas === 'sawit';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono-num font-semibold text-slate-800">
                        {item.no_nota}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {formatDate(item.tanggal)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{item.nama_pelanggan}</div>
                        {item.catatan && (
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">
                            {item.catatan}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                            isEmas
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : isSawit
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                          }`}
                        >
                          {item.jenis_komoditas}
                        </span>
                        {item.kadar && (
                          <div className="text-[10px] text-slate-400 mt-0.5">{item.kadar}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-num font-bold text-slate-900 whitespace-nowrap">
                        {formatWeight(item.berat_bersih, item.satuan)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-num text-slate-600 whitespace-nowrap">
                        {formatRupiah(item.harga_satuan)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-num font-extrabold text-amber-600 whitespace-nowrap">
                        {formatRupiah(item.total_bayar)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {item.metode_bayar?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setReceiptData(item)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
                            title="Cetak Nota"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteId(item.id)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors"
                            title="Hapus Transaksi"
                          >
                            <Trash2 className="w-4 h-4" />
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
            onPageChange={(p) => fetchTransactions(p, pagination.limit, search, selectedKomoditas)}
            onLimitChange={(l) => {
              setPagination((prev) => ({ ...prev, limit: l }));
              fetchTransactions(1, l, search, selectedKomoditas);
            }}
          />
        </div>
      </div>

      {/* Modal: Timbang & Beli Baru */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => !formSubmitting && setIsCreateOpen(false)}
        title="Formulir Timbang & Pembelian Komoditas"
        subtitle="Mendukung timbangan emas 0.000 gram, sawit & karet kg, dan potong kasbon otomatis"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Commodity Type Selector Pills */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Pilih Jenis Komoditas
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'sawit', label: '🌾 Kelapa Sawit (kg)' },
                { id: 'karet', label: '🌳 Karet Rakyat (kg)' },
                { id: 'emas', label: '🪙 Emas (0.000 gr)' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleCommodityTypeChange(item.id)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                    form.jenis_komoditas === item.id
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Customer / Petani Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pilih Mitra / Petani Terdaftar
              </label>
              <select
                value={form.pelanggan_id}
                onChange={handleSelectCustomer}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              >
                <option value="">-- Pelanggan / Petani Bebas (Manual) --</option>
                {pelangganList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.kode} - {c.nama} ({c.kategori})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Mitra / Petani <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.nama_pelanggan}
                onChange={(e) => setForm({ ...form, nama_pelanggan: e.target.value })}
                placeholder="Misal: Pak Haji Mansur"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Customer balance preview */}
          {selectedCustomer && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
              <div>
                <span className="text-slate-500">Kasbon / Hutang: </span>
                <span className="font-bold text-rose-600 font-mono-num">
                  {formatRupiah(selectedCustomer.saldo_hutang)}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Saldo Tabungan/Titipan: </span>
                <span className="font-bold text-blue-600 font-mono-num">
                  {formatRupiah(selectedCustomer.saldo_titipan)}
                </span>
              </div>
            </div>
          )}

          {/* Weighing & Grading Inputs */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Data Penimbangan & Kadar
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Berat Kotor */}
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  Berat Kotor (Bruto) ({form.satuan}) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step={form.jenis_komoditas === 'emas' ? '0.001' : '0.1'}
                  required
                  placeholder={form.jenis_komoditas === 'emas' ? '0.000' : '0.0'}
                  value={form.berat_kotor}
                  onChange={(e) => setForm({ ...form, berat_kotor: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold font-mono-num text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Potongan Persen / Tara */}
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  Potongan / Sortasi (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="0"
                  value={form.potongan_persen}
                  onChange={(e) => setForm({ ...form, potongan_persen: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono-num text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Berat Bersih Readonly */}
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  Berat Bersih (Netto)
                </label>
                <div className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-black font-mono-num text-emerald-700">
                  {formatWeight(netto, form.satuan)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Kadar / Keterangan Kualitas */}
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  Kadar / Kualitas
                </label>
                <input
                  type="text"
                  value={form.kadar}
                  onChange={(e) => setForm({ ...form, kadar: e.target.value })}
                  placeholder={
                    form.jenis_komoditas === 'emas'
                      ? 'Contoh: 22K (70%)'
                      : 'Contoh: TBS Masak / DRC 55%'
                  }
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Harga Satuan */}
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  Harga per {form.satuan} (Rp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={form.harga_satuan}
                  onChange={(e) => setForm({ ...form, harga_satuan: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono-num text-amber-700 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Payment & Settlement */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Total Pembayaran:
              </span>
              <span className="text-lg font-black text-amber-700 font-mono-num">
                {formatRupiah(totalBayar)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  Metode Pembayaran
                </label>
                <select
                  value={form.metode_bayar}
                  onChange={(e) => setForm({ ...form, metode_bayar: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                >
                  <option value="tunai">Tunai Langsung</option>
                  <option value="transfer">Transfer Bank</option>
                  <option value="potong_hutang">Potong Kasbon / Hutang Petani</option>
                  <option value="masuk_titipan">Masuk Tabungan / Titipan Uang</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  Tanggal Transaksi
                </label>
                <input
                  type="date"
                  value={form.tanggal}
                  onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {form.metode_bayar === 'potong_hutang' && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />
                  Potong Hutang Otomatis Aktif
                </div>
                <p className="text-[11px] text-amber-800">
                  Total nilai transaksi sebesar {formatRupiah(totalBayar)} akan otomatis mengurangi buku kasbon petani ini.
                </p>
              </div>
            )}

            {form.metode_bayar === 'masuk_titipan' && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                  Masuk Tabungan / Titipan Uang
                </div>
                <p className="text-[11px] text-blue-800">
                  Hasil penjualan sebesar {formatRupiah(totalBayar)} akan otomatis disimpan di rekening tabungan mitra.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs text-slate-600 mb-1">Catatan Tambahan</label>
              <input
                type="text"
                value={form.catatan}
                onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                placeholder="Keterangan blok kebun, armada truk, perhiasan, dll..."
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              disabled={formSubmitting}
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm flex items-center gap-2"
            >
              {formSubmitting && (
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              )}
              <span>Simpan & Cetak Nota</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Transaksi Pembelian"
        message="Apakah Anda yakin ingin menghapus data transaksi pembelian ini? Data yang dihapus tidak dapat dipulihkan."
        loading={deleteLoading}
      />

      {/* Printable Receipt Modal */}
      <ReceiptModal
        isOpen={Boolean(receiptData)}
        onClose={() => setReceiptData(null)}
        data={receiptData}
        type="komoditas"
        storeInfo={storeInfo}
      />
    </div>
  );
}
