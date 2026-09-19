import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import AsyncSelect from 'react-select/async';
import {
  Scale,
  Plus,
  Trash2,
  Printer,
  ArrowRightLeft,
  CheckCircle2,
  Wallet,
  Banknote,
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

const customPelangganSelectStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: '#ffffff',
    borderColor: state.isFocused ? '#f59e0b' : '#cbd5e1',
    borderRadius: '0.75rem',
    fontSize: '0.75rem',
    minHeight: '40px',
    boxShadow: state.isFocused ? '0 0 0 1px #f59e0b' : 'none',
    '&:hover': {
      borderColor: state.isFocused ? '#f59e0b' : '#94a3b8',
    },
    cursor: 'pointer',
  }),
  menu: (base) => ({
    ...base,
    borderRadius: '0.75rem',
    overflow: 'hidden',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    zIndex: 9999,
    fontSize: '0.75rem',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
  }),
  menuList: (base) => ({
    ...base,
    padding: '4px',
    maxHeight: '180px',
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999,
  }),
  option: (base, state) => ({
    ...base,
    borderRadius: '0.5rem',
    margin: '2px 0',
    backgroundColor: state.isSelected
      ? '#f59e0b'
      : state.isFocused
      ? '#fef3c7'
      : 'transparent',
    color: state.isSelected ? '#ffffff' : '#0f172a',
    cursor: 'pointer',
    fontSize: '0.75rem',
    padding: '6px 10px',
  }),
  singleValue: (base) => ({
    ...base,
    color: '#0f172a',
    fontSize: '0.75rem',
    fontWeight: '600',
  }),
  input: (base) => ({
    ...base,
    color: '#0f172a',
    fontSize: '0.75rem',
  }),
  placeholder: (base) => ({
    ...base,
    color: '#94a3b8',
    fontSize: '0.75rem',
  }),
  dropdownIndicator: (base) => ({
    ...base,
    padding: '4px 8px',
    color: '#94a3b8',
    '&:hover': {
      color: '#64748b',
    },
  }),
  clearIndicator: (base) => ({
    ...base,
    padding: '4px 8px',
    color: '#94a3b8',
    '&:hover': {
      color: '#ef4444',
    },
  }),
};

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

  // Saldo Uang Kas Toko State
  const [saldoKas, setSaldoKas] = useState(0);
  const [loadingKas, setLoadingKas] = useState(false);

  // Quick Modal "Siapkan Uang Kas Toko"
  const [isKasModalOpen, setIsKasModalOpen] = useState(false);
  const [kasModalForm, setKasModalForm] = useState({
    jumlah: '',
    kategori: 'Modal Belanja Komoditas',
    keterangan: 'Dana disiapkan untuk belanja emas & komoditas hari ini',
    tanggal: new Date().toISOString().split('T')[0],
  });
  const [submittingKas, setSubmittingKas] = useState(false);

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

  // Fetch saldo kas toko
  const fetchSaldoKas = async () => {
    setLoadingKas(true);
    try {
      const res = await request.get(API_ENDPOINTS.KAS.LIST, { limit: 1 });
      if (res?.success && res.summary) {
        setSaldoKas(parseFloat(res.summary.saldo_kas) || 0);
      }
    } catch (err) {
      console.error('Gagal mengambil saldo kas:', err);
    } finally {
      setLoadingKas(false);
    }
  };

  useEffect(() => {
    fetchTransactions(1, pagination.limit, search, selectedKomoditas);
  }, [search, selectedKomoditas]);

  useEffect(() => {
    fetchPelanggan();
    fetchSaldoKas();
  }, []);

  const handleKasModalSubmit = async (e) => {
    e.preventDefault();
    const nominal = parseFloat(kasModalForm.jumlah);
    if (!nominal || nominal <= 0) {
      toast.error('Masukkan jumlah uang kas modal yang valid!');
      return;
    }
    setSubmittingKas(true);
    try {
      const res = await request.post(API_ENDPOINTS.KAS.CREATE, {
        tipe: 'masuk',
        kategori: kasModalForm.kategori.trim() || 'Modal Belanja Komoditas',
        jumlah: nominal,
        keterangan: kasModalForm.keterangan.trim(),
        tanggal: kasModalForm.tanggal,
      });
      if (res?.success) {
        toast.success(`Uang kas ${formatRupiah(nominal)} berhasil disiapkan!`);
        setIsKasModalOpen(false);
        setKasModalForm({
          jumlah: '',
          kategori: 'Modal Belanja Komoditas',
          keterangan: 'Dana disiapkan untuk belanja emas & komoditas hari ini',
          tanggal: new Date().toISOString().split('T')[0],
        });
        fetchSaldoKas();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyiapkan uang kas');
    } finally {
      setSubmittingKas(false);
    }
  };

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
      pembagi_1: '',
      pembagi_2: '',
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

  const searchPelangganTimerRef = useRef(null);

  const loadPelangganOptions = (inputValue) => {
    return new Promise((resolve) => {
      if (searchPelangganTimerRef.current) clearTimeout(searchPelangganTimerRef.current);
      const delay = inputValue ? 300 : 0;
      searchPelangganTimerRef.current = setTimeout(async () => {
        try {
          const res = await request.get(API_ENDPOINTS.PELANGGAN.LIST, {
            search: inputValue ? inputValue.trim() : '',
            limit: 30,
          });
          if (res?.success && Array.isArray(res.data)) {
            const apiOptions = res.data.map((c) => ({
              value: c.id,
              label: `${c.kode} - ${c.nama}`,
              subLabel: `${c.kategori}${c.no_hp ? ' • ' + c.no_hp : ''}`,
              data: c,
            }));
            if (!inputValue) {
              resolve([
                {
                  value: '',
                  label: '👤 -- Pelanggan Bebas / Non-Mitra (Manual) --',
                  subLabel: 'Ketik nama manual di kolom sebelah kanan',
                  data: null,
                },
                ...apiOptions,
              ]);
            } else {
              resolve(apiOptions);
            }
          } else {
            resolve([]);
          }
        } catch (err) {
          console.error('Gagal memuat opsi pelanggan:', err);
          resolve([]);
        }
      }, delay);
    });
  };

  const handleSelectCustomerOption = (selectedOption) => {
    if (!selectedOption || !selectedOption.value || !selectedOption.data) {
      setSelectedCustomer(null);
      setForm((prev) => ({
        ...prev,
        pelanggan_id: '',
      }));
    } else {
      const found = selectedOption.data;
      setSelectedCustomer(found);
      setForm((prev) => ({
        ...prev,
        pelanggan_id: found.id,
        nama_pelanggan: found.nama,
      }));
    }
  };

  const currentCustomerOption = selectedCustomer
    ? {
        value: selectedCustomer.id,
        label: `${selectedCustomer.kode} - ${selectedCustomer.nama}`,
        subLabel: `${selectedCustomer.kategori}${selectedCustomer.no_hp ? ' • ' + selectedCustomer.no_hp : ''}`,
        data: selectedCustomer,
      }
    : form.pelanggan_id
    ? {
        value: form.pelanggan_id,
        label: form.nama_pelanggan || 'Mitra Terpilih',
        data: null,
      }
    : null;

  // Computations
  const bruto = Number(form.berat_kotor) || 0;
  const pct = Number(form.potongan_persen) || 0;
  let potVal = Number(form.potongan_nilai) || 0;

  if (pct > 0 && bruto > 0) {
    potVal = Number(((bruto * pct) / 100).toFixed(3));
  }
  const netto = Math.max(0, bruto - potVal);
  const harga = Number(form.harga_satuan) || 0;
  const grossTotal = Math.round(bruto * harga);

  let afterPotong = grossTotal;
  if (pct > 0) {
    afterPotong = Math.round(grossTotal * (1 - pct / 100));
  } else if (potVal > 0) {
    afterPotong = Math.round(netto * harga);
  } else {
    afterPotong = Math.round(netto * harga);
  }

  const bagi1 = Number(form.pembagi_1) || 0;
  const afterBagi1 = bagi1 > 0 ? Math.round(afterPotong / bagi1) : afterPotong;

  const bagi2 = Number(form.pembagi_2) || 0;
  const afterBagi2 = bagi2 > 0 ? Math.round(afterBagi1 / bagi2) : afterBagi1;

  const biayaLain = Number(form.biaya_lain) || 0;

  // Nilai Pembelian Barang Toko (Total Pengeluaran Uang Kas Toko):
  // Pembelian 1 gr emas seharga 2.010.000 adalah pengeluaran riil kas toko (grossTotal - biayaLain)
  // Pembagian hasil mitra (dibagi 2, dibagi 6) adalah rincian kalkulasi mitra yang tertera pada nota (bukan pengurangan kas toko).
  const totalBeliToko = form.jenis_komoditas === 'emas'
    ? Math.max(0, grossTotal - biayaLain)
    : Math.max(0, afterPotong - biayaLain);

  // Nilai bagi hasil mitra per bagian/pekerja (yang dicetak di nota jika ada pembagian):
  const nilaiBagiHasil = bagi1 > 0 || bagi2 > 0 ? Math.max(0, afterBagi2 - biayaLain) : totalBeliToko;

  // Total Bayar yang menjadi pengurangan kas toko & tercatat di laporan pengeluaran:
  const totalBayar = totalBeliToko;

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

    if ((form.metode_bayar === 'tunai' || form.metode_bayar === 'transfer') && totalBayar > saldoKas) {
      toast.error(`Uang kas tidak mencukupi! Kurang ${formatRupiah(totalBayar - saldoKas)}. Harap siapkan uang kas modal belanja terlebih dahulu.`);
      return;
    }

    setFormSubmitting(true);
    try {
      let catatanTeks = form.catatan || '';
      if (bagi1 > 0 || bagi2 > 0) {
        const bagiNotes = [
          bagi1 > 0 ? `Dibagi ${bagi1}` : null,
          bagi2 > 0 ? `Dibagi ${bagi2}` : null,
        ].filter(Boolean).join(', ');
        catatanTeks = catatanTeks ? `${catatanTeks} (${bagiNotes})` : bagiNotes;
      }

      const payload = {
        pelanggan_id: form.pelanggan_id || null,
        nama_pelanggan: form.nama_pelanggan,
        jenis_komoditas: form.jenis_komoditas,
        berat_kotor: bruto,
        potongan_persen: pct,
        potongan_nilai: potVal,
        pembagi_1: form.pembagi_1 || null,
        pembagi_2: form.pembagi_2 || null,
        gross_total: grossTotal,
        after_potong: afterPotong,
        after_bagi_1: afterBagi1,
        after_bagi_2: afterBagi2,
        berat_bersih: netto,
        satuan: form.satuan,
        kadar: form.kadar,
        harga_satuan: harga,
        subtotal: form.jenis_komoditas === 'emas' ? grossTotal : afterPotong,
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
        catatan: catatanTeks,
        tanggal: form.tanggal,
      };

      const res = await request.post(API_ENDPOINTS.TRANSAKSI_BELI.CREATE, payload);
      if (res?.success) {
        toast.success('Transaksi pembelian berhasil dicatat & uang kas terpotong!');
        setIsCreateOpen(false);
        fetchTransactions(1, pagination.limit, search, selectedKomoditas);
        fetchPelanggan();
        fetchSaldoKas();

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
        toast.success('Transaksi berhasil dihapus & saldo kas dikembalikan');
        setDeleteId(null);
        fetchTransactions(pagination.page, pagination.limit, search, selectedKomoditas);
        fetchSaldoKas();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus transaksi');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 sm:gap-2.5">
            <Scale className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500 shrink-0" />
            <span>Pembelian Komoditas</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
            Penimbangan hasil bumi dan emas presisi, hitung potongan otomatis, potong kasbon, dan cetak nota.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Sisa Uang Kas Belanja Card */}
          <div className="flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-emerald-50 border border-emerald-200/80 shadow-xs">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div>
              <div className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-emerald-700">
                Kas Belanja
              </div>
              <div className="text-xs sm:text-sm font-black text-emerald-950 font-mono-num">
                {loadingKas ? 'Memuat...' : formatRupiah(saldoKas)}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsKasModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-all cursor-pointer"
          >
            <Banknote className="w-4 h-4 text-emerald-600" />
            <span>Siapkan Kas</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Timbang & Beli</span>
          </button>
        </div>
      </div>

      {/* Filters & Search Row */}
      <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-4">
        {/* Realtime Debounced Search on top on mobile */}
        <div className="w-full md:w-72 order-1 md:order-2">
          <DebouncedSearch
            value={search}
            onChange={(val) => setSearch(val)}
            placeholder="Cari no nota / mitra..."
          />
        </div>

        {/* Commodity Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200/80 w-full md:w-auto overflow-x-auto no-scrollbar order-2 md:order-1">
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
      </div>

      {/* Transactions Table & Mobile Cards */}
      <div className="rounded-xl sm:rounded-2xl bg-white border border-slate-200/90 overflow-hidden shadow-sm">
        {/* Mobile Card List (sm:hidden) */}
        <div className="block sm:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-4"><TableSkeleton rows={4} cols={1} /></div>
          ) : list.length === 0 ? (
            <EmptyState
              title="Belum Ada Transaksi Pembelian"
              description="Belum ada data pembelian komoditas yang dicatat. Klik tombol di bawah untuk mulai menimbang."
              actionLabel="Timbang & Beli Baru"
              onAction={openCreateModal}
            />
          ) : (
            list.map((item) => {
              const isEmas = item.jenis_komoditas === 'emas';
              const isSawit = item.jenis_komoditas === 'sawit';

              return (
                <div key={item.id} className="p-3.5 flex flex-col gap-2 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono-num font-bold text-xs text-slate-800">{item.no_nota}</span>
                      <span className="text-[10px] text-slate-400">• {formatDate(item.tanggal)}</span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase shrink-0 ${
                        isEmas
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : isSawit
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                      }`}
                    >
                      {item.jenis_komoditas}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 text-sm">{item.nama_pelanggan}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {formatWeight(item.berat_bersih, item.satuan)} @ {formatRupiah(item.harga_satuan)}
                        {item.kadar && ` (${item.kadar})`}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-slate-400">Total Bayar</div>
                      <div className="text-sm font-black font-mono-num text-amber-600">
                        {formatRupiah(item.total_bayar)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-xs">
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {item.metode_bayar?.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setReceiptData(item)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Nota</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(item.id)}
                        className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200"
                        title="Hapus Transaksi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table (hidden sm:block) */}
        <div className="hidden sm:block overflow-x-auto">
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
            <div className="mt-1.5 hidden sm:flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50/80 border border-emerald-200/70 px-2.5 py-1.5 rounded-xl font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>
                Hasil timbang beli ini otomatis menambah stok produk{' '}
                <strong className="font-bold">
                  {form.jenis_komoditas === 'emas'
                    ? 'Emas Murni / Leburan'
                    : form.jenis_komoditas === 'sawit'
                    ? 'Kelapa Sawit (TBS)'
                    : 'Karet Rakyat'}
                </strong>{' '}
                di katalog Kasir Toko.
              </span>
            </div>
          </div>

          {/* Customer / Petani Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Pilih Mitra / Petani Terdaftar
                </label>
                {selectedCustomer && (
                  <button
                    type="button"
                    onClick={() => handleSelectCustomerOption(null)}
                    className="text-[10px] text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    Reset ke Manual
                  </button>
                )}
              </div>
              <AsyncSelect
                cacheOptions
                defaultOptions
                loadOptions={loadPelangganOptions}
                value={currentCustomerOption}
                onChange={handleSelectCustomerOption}
                isClearable={Boolean(selectedCustomer)}
                placeholder="Ketik nama, kode, atau no HP mitra..."
                loadingMessage={() => 'Mencari data mitra dari server...'}
                noOptionsMessage={({ inputValue }) =>
                  inputValue
                    ? `Mitra "${inputValue}" tidak ditemukan`
                    : 'Ketik nama / kode / no HP untuk mencari mitra'
                }
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                styles={customPelangganSelectStyles}
                formatOptionLabel={(option, { context }) => {
                  if (context === 'value') {
                    return (
                      <div className="font-semibold text-slate-800 text-xs truncate">
                        {option.label}
                      </div>
                    );
                  }

                  if (!option.data) {
                    return (
                      <div className="py-0.5">
                        <div className="font-semibold text-slate-800 text-xs">
                          {option.label}
                        </div>
                        {option.subLabel && (
                          <div className="text-[10px] text-slate-400">
                            {option.subLabel}
                          </div>
                        )}
                      </div>
                    );
                  }

                  const c = option.data;
                  const hasHutang = Number(c.saldo_hutang) > 0;
                  const hasTitipan = Number(c.saldo_titipan) > 0;

                  return (
                    <div className="py-1">
                      <div className="font-semibold text-slate-900 text-xs break-words">
                        <span className="text-slate-500 font-mono text-[11px]">{c.kode}</span> - {c.nama}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5 text-[10px]">
                        <span className="text-slate-400 truncate">
                          {c.kategori || 'Mitra'}{c.no_hp ? ` • ${c.no_hp}` : ''}
                        </span>
                        {(hasHutang || hasTitipan) && (
                          <div className="flex items-center gap-1 shrink-0">
                            {hasHutang && (
                              <span className="bg-rose-50 text-rose-600 border border-rose-200 px-1.5 py-0.5 rounded font-mono font-medium whitespace-nowrap">
                                Bon: {formatRupiah(c.saldo_hutang)}
                              </span>
                            )}
                            {hasTitipan && (
                              <span className="bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded font-mono font-medium whitespace-nowrap">
                                Tab: {formatRupiah(c.saldo_titipan)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }}
              />
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
                placeholder="Misal: Siti Rahmawati / Petani Bebas"
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs text-slate-600">
                    Potongan / Sortasi (%)
                  </label>
                  {pct > 0 && grossTotal > 0 && (
                    <span className="text-[10.5px] font-bold text-amber-700 font-mono-num">
                      Lahan: {formatRupiah(Math.round((grossTotal * pct) / 100))}
                    </span>
                  )}
                </div>
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

          {/* Pembagian / Bagi Hasil (Opsional - Contoh: Dibagi 2, Dibagi 6) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                Pembagian Hasil Mitra / Pekerja (Opsional)
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Contoh: Dibagi 2 lalu Dibagi 6
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  Pembagian Tahap 1 (Misal: Dibagi 2)
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  placeholder="Kosongkan jika tidak dibagi"
                  value={form.pembagi_1}
                  onChange={(e) => setForm({ ...form, pembagi_1: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono-num text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  Pembagian Tahap 2 (Misal: Dibagi 6)
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  placeholder="Kosongkan jika tidak dibagi"
                  value={form.pembagi_2}
                  onChange={(e) => setForm({ ...form, pembagi_2: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono-num text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {(bagi1 > 0 || bagi2 > 0 || pct > 0) && (
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1 font-mono-num">
                <div className="flex justify-between text-slate-600">
                  <span>1. Subtotal Awal ({formatWeight(bruto, form.satuan)} @ {formatRupiah(harga)}):</span>
                  <span>{formatRupiah(grossTotal)}</span>
                </div>
                {pct > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span>2. Setelah Potong {pct}%:</span>
                    <span>{formatRupiah(afterPotong)}</span>
                  </div>
                )}
                {bagi1 > 0 && (
                  <div className="flex justify-between text-blue-700">
                    <span>3. Setelah Dibagi {bagi1}:</span>
                    <span>{formatRupiah(afterBagi1)}</span>
                  </div>
                )}
                {bagi2 > 0 && (
                  <div className="flex justify-between text-purple-700">
                    <span>4. Setelah Dibagi {bagi2}:</span>
                    <span>{formatRupiah(afterBagi2)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment & Settlement */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Total Pengeluaran Kas Toko:
                </span>
                {(bagi1 > 0 || bagi2 > 0) && (
                  <span className="text-[11px] text-purple-700 font-semibold block">
                    Bagi Hasil Cetak Nota: {formatRupiah(nilaiBagiHasil)} (per orang)
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-amber-700 font-mono-num">
                  {formatRupiah(totalBayar)}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {form.jenis_komoditas === 'emas' ? 'Nilai beli penuh 100% komoditas emas' : 'Total pembelian netto'}
                </span>
              </div>
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

            {/* Status & Simulasi Uang Kas Toko */}
            {(form.metode_bayar === 'tunai' || form.metode_bayar === 'transfer') && (
              <div
                className={`p-3.5 rounded-2xl border text-xs space-y-2.5 transition-all ${
                  totalBayar > saldoKas
                    ? 'bg-rose-50/90 border-rose-200 text-rose-900'
                    : 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5">
                    <Wallet className="w-4 h-4" />
                    Simulasi Saldo Kas Toko
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      totalBayar > saldoKas
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {totalBayar > saldoKas ? 'Kas Tidak Cukup' : 'Kas Siap & Cukup'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-0.5 text-center font-mono-num">
                  <div className="p-2 rounded-xl bg-white/90 border border-slate-200/80 shadow-2xs">
                    <div className="text-[10px] text-slate-500 font-sans">Kas Tersedia</div>
                    <div className="font-bold text-slate-800 text-xs truncate">
                      {formatRupiah(saldoKas)}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-white/90 border border-slate-200/80 shadow-2xs">
                    <div className="text-[10px] text-slate-500 font-sans">Biaya Beli</div>
                    <div className="font-bold text-amber-700 text-xs truncate">
                      -{formatRupiah(totalBayar)}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-white/90 border border-slate-200/80 shadow-2xs">
                    <div className="text-[10px] text-slate-500 font-sans">Sisa Kas Nanti</div>
                    <div
                      className={`font-black text-xs truncate ${
                        totalBayar > saldoKas ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {formatRupiah(Math.max(0, saldoKas - totalBayar))}
                    </div>
                  </div>
                </div>

                {totalBayar > saldoKas ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-rose-200/80">
                    <span className="text-[11px] text-rose-700 font-medium">
                      ⚠️ Sisa kas kurang <strong>{formatRupiah(totalBayar - saldoKas)}</strong>. Harap siapkan uang kas dulu.
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsKasModalOpen(true)}
                      className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] shadow-xs flex items-center justify-center gap-1 shrink-0 transition-all"
                    >
                      <Plus className="w-3 h-3" />
                      Siapkan Kas Sekarang
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-emerald-700 font-medium">
                    ✅ Uang kas cukup. Setelah transaksi ini disimpan, sisa uang kas toko menjadi{' '}
                    <strong>{formatRupiah(saldoKas - totalBayar)}</strong>.
                  </p>
                )}
              </div>
            )}
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
              disabled={formSubmitting || ((form.metode_bayar === 'tunai' || form.metode_bayar === 'transfer') && totalBayar > saldoKas)}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm flex items-center gap-2 ${
                (form.metode_bayar === 'tunai' || form.metode_bayar === 'transfer') && totalBayar > saldoKas
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              }`}
            >
              {formSubmitting && (
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              )}
              <span>Simpan & Cetak Nota</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Modal: Siapkan Uang Kas Toko */}
      <Modal
        isOpen={isKasModalOpen}
        onClose={() => setIsKasModalOpen(false)}
        title="Siapkan Uang Kas Toko / Modal Belanja"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleKasModalSubmit} className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-emerald-600" />
              Sedia Uang Kas Sebelum Belanja
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Siapkan dana belanja operasional (misal: Rp 100 Juta). Setiap pembelian komoditas/emas secara tunai akan otomatis memotong uang kas toko ini secara realtime.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Jumlah Uang Kas Masuk (Rp) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              required
              min="1000"
              placeholder="Contoh: 100000000"
              value={kasModalForm.jumlah}
              onChange={(e) => setKasModalForm({ ...kasModalForm, jumlah: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-black font-mono-num text-slate-900 focus:border-emerald-500 focus:outline-none"
            />
            {kasModalForm.jumlah && (
              <p className="text-xs font-bold text-emerald-600 mt-1 font-mono-num">
                {formatRupiah(kasModalForm.jumlah)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kategori Kas
            </label>
            <input
              type="text"
              required
              value={kasModalForm.kategori}
              onChange={(e) => setKasModalForm({ ...kasModalForm, kategori: e.target.value })}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tanggal Kas Masuk
            </label>
            <input
              type="date"
              required
              value={kasModalForm.tanggal}
              onChange={(e) => setKasModalForm({ ...kasModalForm, tanggal: e.target.value })}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Keterangan
            </label>
            <input
              type="text"
              value={kasModalForm.keterangan}
              onChange={(e) => setKasModalForm({ ...kasModalForm, keterangan: e.target.value })}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={submittingKas}
              onClick={() => setIsKasModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submittingKas}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-2"
            >
              {submittingKas && (
                <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              )}
              <span>Simpan Uang Kas</span>
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
