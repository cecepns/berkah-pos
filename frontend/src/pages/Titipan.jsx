import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import AsyncSelect from 'react-select/async';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Minus,
  Printer,
  RefreshCw,
  User,
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

export default function Titipan() {
  const { storeInfo } = useOutletContext();

  const [list, setList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCustomer, setFilterCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [customers, setCustomers] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionType, setActionType] = useState('setor');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    pelanggan_id: '',
    jumlah: '',
    keterangan: '',
    tanggal: new Date().toISOString().split('T')[0],
  });

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [receiptData, setReceiptData] = useState(null);

  const fetchTitipan = async (
    page = pagination.page,
    limit = pagination.limit,
    q = search,
    type = filterType,
    pelangganId = filterCustomer?.value
  ) => {
    setLoading(true);
    try {
      const res = await request.get(API_ENDPOINTS.TITIPAN.LIST, {
        page,
        limit,
        search: q,
        jenis_transaksi: type,
        pelanggan_id: pelangganId || undefined,
      });
      if (res?.success) {
        setList(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch {
      toast.error('Gagal mengambil data tabungan titipan');
    } finally {
      setLoading(false);
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
    fetchTitipan(1, pagination.limit, search, filterType, filterCustomer?.value);
  }, [search, filterType, filterCustomer, pagination.limit]);

  let customerSearchTimeout = null;
  const loadCustomerOptions = (inputValue) => {
    return new Promise((resolve) => {
      if (customerSearchTimeout) clearTimeout(customerSearchTimeout);
      const delay = !inputValue ? 0 : 300;
      customerSearchTimeout = setTimeout(async () => {
        try {
          const res = await request.get(API_ENDPOINTS.PELANGGAN.LIST, {
            search: inputValue || '',
            limit: 30,
          });
          if (res?.success && Array.isArray(res.data)) {
            const apiOptions = res.data.map((c) => ({
              value: c.id,
              label: `${c.kode} - ${c.nama}`,
              subLabel: `${c.kategori}${c.no_hp ? ' • ' + c.no_hp : ''}`,
              data: c,
            }));
            resolve(apiOptions);
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

  const handleSyncSaldo = async () => {
    setSyncing(true);
    try {
      const res = await request.post(API_ENDPOINTS.TITIPAN.PERBAIKI_SALDO);
      if (res?.success) {
        toast.success(res.message || 'Saldo tabungan & buku kas berhasil disinkronkan!');
        fetchTitipan(1, pagination.limit, search, filterType);
        fetchCustomers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyinkronkan saldo tabungan');
    } finally {
      setSyncing(false);
    }
  };

  const openActionModal = (type) => {
    setActionType(type);
    setSelectedCustomer(null);
    setForm({
      pelanggan_id: '',
      jumlah: '',
      keterangan: type === 'setor' ? 'Setor tabungan simpanan' : 'Penarikan tabungan tunai',
      tanggal: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.pelanggan_id) {
      toast.error('Pilih mitra petani / nasabah!');
      return;
    }

    const jumlah = Number(form.jumlah);
    if (jumlah <= 0) {
      toast.error('Jumlah uang wajib lebih dari 0!');
      return;
    }

    if (actionType === 'tarik') {
      const currentSaldo = Number(selectedCustomer?.saldo_titipan || 0);
      if (jumlah > currentSaldo) {
        toast.error(
          `Saldo tabungan tidak mencukupi! Sisa saldo saat ini: ${formatRupiah(currentSaldo)}`
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        kode_titipan: `TTP-${String(Date.now()).slice(-5)}`,
        pelanggan_id: Number(form.pelanggan_id),
        jenis_transaksi: actionType,
        jumlah,
        keterangan: form.keterangan,
        tanggal: form.tanggal,
      };

      const res = await request.post(API_ENDPOINTS.TITIPAN.CREATE, payload);
      if (res?.success) {
        toast.success(
          actionType === 'setor'
            ? 'Setoran tabungan berhasil disimpan & kas bertambah!'
            : 'Penarikan tabungan berhasil diproses & kas berkurang!'
        );
        setIsModalOpen(false);
        fetchTitipan(1, pagination.limit, search, filterType);
        fetchCustomers();

        const saved = res.data;
        const saldoSebelum = saved?.saldo_sebelum !== undefined 
          ? Number(saved.saldo_sebelum) 
          : Number(selectedCustomer?.saldo_titipan || 0);
        const saldoSesudah = saved?.saldo_sesudah !== undefined
          ? Number(saved.saldo_sesudah)
          : (actionType === 'setor' ? saldoSebelum + jumlah : saldoSebelum - jumlah);

        setReceiptData({
          kode_titipan: saved?.kode_titipan || payload.kode_titipan,
          pelanggan_nama: saved?.nama_pelanggan || saved?.pelanggan_nama || selectedCustomer?.nama,
          jenis_transaksi: saved?.jenis_transaksi || actionType,
          saldo_sebelum: saldoSebelum,
          jumlah: Number(saved?.jumlah || jumlah),
          saldo_sesudah: saldoSesudah,
          tanggal: saved?.tanggal || payload.tanggal,
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memproses transaksi tabungan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Wallet className="w-6 h-6 text-blue-600" />
            Tabungan & Titipan Uang Petani
          </h2>
          <p className="hidden sm:block text-xs sm:text-sm text-slate-500 mt-1">
            Layanan simpanan hasil panen petani, setor tunai, tarik tabungan, dan mutasi otomatis kas toko.
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            disabled={syncing}
            onClick={handleSyncSaldo}
            className="flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-all disabled:opacity-50"
            title="Sinkronkan saldo tabungan dan buku kas toko"
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 ${syncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sinkron Saldo & Kas</span>
            <span className="sm:hidden">Sinkron</span>
          </button>
          <button
            type="button"
            onClick={() => openActionModal('setor')}
            className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Setor Simpanan</span>
          </button>
          <button
            type="button"
            onClick={() => openActionModal('tarik')}
            className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm shadow-2xs transition-all"
          >
            <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
            <span>Tarik Tabungan</span>
          </button>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 no-scrollbar">
          {[
            { id: '', label: 'Semua Mutasi' },
            { id: 'setor', label: 'Setor Tunai' },
            { id: 'tarik', label: 'Penarikan' },
            { id: 'masuk_dari_jual_komoditas', label: 'Dari Jual Komoditas' },
            { id: 'potong_bayar_belanja', label: 'Bayar Belanja' },
            { id: 'potong_bayar_hutang', label: 'Bayar Hutang' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilterType(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                filterType === item.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
          {/* Dropdown React Select Search By API Pelanggan */}
          <div className="w-full sm:w-64">
            <AsyncSelect
              isClearable
              cacheOptions
              defaultOptions
              loadOptions={loadCustomerOptions}
              value={filterCustomer}
              onChange={(opt) => setFilterCustomer(opt || null)}
              placeholder="🔍 Cari & Filter Nasabah..."
              noOptionsMessage={({ inputValue }) =>
                inputValue ? 'Mitra tidak ditemukan' : 'Ketik nama nasabah...'
              }
              loadingMessage={() => 'Mencari mitra di server...'}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              styles={{
                menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                control: (base) => ({
                  ...base,
                  minHeight: '38px',
                  borderRadius: '0.75rem',
                  borderColor: '#cbd5e1',
                  fontSize: '0.75rem',
                }),
                menuList: (base) => ({ ...base, maxHeight: '200px' }),
              }}
              formatOptionLabel={(option) => {
                const c = option.data;
                if (!c) return <span>{option.label}</span>;
                return (
                  <div className="flex flex-col py-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs">{c.nama}</span>
                      <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded">
                        {c.kode}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                      <span className="capitalize">{c.kategori} {c.no_hp ? `• ${c.no_hp}` : ''}</span>
                      <span className="font-semibold text-blue-600 font-mono-num">
                        Saldo: {formatRupiah(c.saldo_titipan || 0)}
                      </span>
                    </div>
                  </div>
                );
              }}
            />
          </div>

          <div className="w-full sm:w-56">
            <DebouncedSearch
              value={search}
              onChange={(val) => setSearch(val)}
              placeholder="Cari kode transaksi..."
            />
          </div>
        </div>
      </div>

      {/* List Mutasi Titipan: Desktop Table & Mobile Cards */}
      <div className="rounded-2xl bg-white border border-slate-200/90 overflow-hidden shadow-sm">
        {/* Tampilan Desktop Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4">Kode & Tanggal</th>
                <th className="py-3.5 px-4">Mitra Nasabah</th>
                <th className="py-3.5 px-4">Jenis Transaksi</th>
                <th className="py-3.5 px-4 text-right">Saldo Sebelum</th>
                <th className="py-3.5 px-4 text-right">Nominal Mutasi</th>
                <th className="py-3.5 px-4 text-right">Saldo Sesudah</th>
                <th className="py-3.5 px-4 text-center">Cetak</th>
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
                      title="Belum Ada Mutasi Tabungan"
                      description="Belum ada transaksi simpanan/titipan uang."
                      actionLabel="Setor Simpanan Baru"
                      onAction={() => openActionModal('setor')}
                    />
                  </td>
                </tr>
              ) : (
                list.map((item) => {
                  const isPlus =
                    item.jenis_transaksi === 'setor' ||
                    item.jenis_transaksi === 'masuk_dari_jual_komoditas';
                  const custName = item.nama_pelanggan || item.pelanggan_nama || 'Nasabah Umum';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-mono-num font-semibold text-slate-800">
                          {item.kode_titipan}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {formatDate(item.tanggal)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{custName}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isPlus
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {isPlus ? (
                            <ArrowDownLeft className="w-3 h-3 text-blue-600" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3 text-amber-600" />
                          )}
                          <span className="capitalize">{item.jenis_transaksi.replace(/_/g, ' ')}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-num text-slate-500">
                        {formatRupiah(item.saldo_sebelum)}
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right font-mono-num font-extrabold ${
                          isPlus ? 'text-blue-600' : 'text-amber-600'
                        }`}
                      >
                        {isPlus ? '+' : '-'} {formatRupiah(item.jumlah)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-num font-bold text-slate-900">
                        {formatRupiah(item.saldo_sesudah)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            setReceiptData({
                              kode_titipan: item.kode_titipan,
                              pelanggan_nama: custName,
                              jenis_transaksi: item.jenis_transaksi,
                              saldo_sebelum: item.saldo_sebelum,
                              jumlah: item.jumlah,
                              saldo_sesudah: item.saldo_sesudah,
                              tanggal: item.tanggal,
                            })
                          }
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
                          title="Cetak Bukti"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Tampilan Mobile Cards (Mencegah teks & kolom terpotong di layar HP) */}
        <div className="block sm:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-4">
              <TableSkeleton rows={4} cols={2} />
            </div>
          ) : list.length === 0 ? (
            <EmptyState
              title="Belum Ada Mutasi Tabungan"
              description="Belum ada transaksi simpanan/titipan uang."
              actionLabel="Setor Simpanan Baru"
              onAction={() => openActionModal('setor')}
            />
          ) : (
            list.map((item) => {
              const isPlus =
                item.jenis_transaksi === 'setor' ||
                item.jenis_transaksi === 'masuk_dari_jual_komoditas';
              const custName = item.nama_pelanggan || item.pelanggan_nama || 'Nasabah Umum';

              return (
                <div key={item.id} className="p-3.5 space-y-2.5 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-slate-800">
                        {item.kode_titipan}
                      </span>
                      <div className="text-[11px] text-slate-500">
                        {formatDate(item.tanggal)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          isPlus
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {isPlus ? (
                          <ArrowDownLeft className="w-3 h-3 text-blue-600" />
                        ) : (
                          <ArrowUpRight className="w-3 h-3 text-amber-600" />
                        )}
                        <span className="capitalize">{item.jenis_transaksi.replace(/_/g, ' ')}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setReceiptData({
                            kode_titipan: item.kode_titipan,
                            pelanggan_nama: custName,
                            jenis_transaksi: item.jenis_transaksi,
                            saldo_sebelum: item.saldo_sebelum,
                            jumlah: item.jumlah,
                            saldo_sesudah: item.saldo_sesudah,
                            tanggal: item.tanggal,
                          })
                        }
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                        title="Cetak Bukti"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-500 font-medium">Nasabah:</span>
                    <span className="font-bold text-slate-900">{custName}</span>
                  </div>

                  {item.keterangan && (
                    <div className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                      "{item.keterangan}"
                    </div>
                  )}

                  {/* Rincian Saldo 3 Kolom Responsif */}
                  <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 font-medium">Sebelum</span>
                      <span className="font-mono-num text-[11px] text-slate-600 font-semibold truncate">
                        {formatRupiah(item.saldo_sebelum)}
                      </span>
                    </div>
                    <div className="flex flex-col border-x border-slate-200/80 px-1">
                      <span className="text-[10px] text-slate-400 font-medium">Mutasi</span>
                      <span
                        className={`font-mono-num text-[11px] font-black truncate ${
                          isPlus ? 'text-blue-600' : 'text-amber-600'
                        }`}
                      >
                        {isPlus ? '+' : '-'} {formatRupiah(item.jumlah)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 font-medium">Akhir</span>
                      <span className="font-mono-num text-[11px] text-slate-900 font-black truncate">
                        {formatRupiah(item.saldo_sesudah)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-slate-100 px-4">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            limit={pagination.limit}
            onPageChange={(p) => fetchTitipan(p, pagination.limit, search, filterType, filterCustomer?.value)}
            onLimitChange={(l) => {
              setPagination((prev) => ({ ...prev, limit: l }));
              fetchTitipan(1, l, search, filterType, filterCustomer?.value);
            }}
          />
        </div>
      </div>

      {/* Modal: Setor / Tarik Tabungan */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={actionType === 'setor' ? 'Setoran Tabungan Simpanan' : 'Penarikan Tabungan Uang'}
        subtitle={
          actionType === 'setor'
            ? 'Terima uang simpanan dari mitra untuk dititipkan di toko & masuk ke kas'
            : 'Proses penarikan uang tabungan oleh mitra & keluar dari kas toko'
        }
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pilih Mitra Petani / Nasabah <span className="text-rose-500">*</span>
            </label>
            <AsyncSelect
              cacheOptions
              defaultOptions
              loadOptions={loadCustomerOptions}
              value={
                selectedCustomer
                  ? {
                      value: selectedCustomer.id,
                      label: `${selectedCustomer.kode} - ${selectedCustomer.nama}`,
                      data: selectedCustomer,
                    }
                  : null
              }
              onChange={(opt) => {
                setSelectedCustomer(opt?.data || null);
                setForm({
                  ...form,
                  pelanggan_id: opt?.data?.id || '',
                });
              }}
              placeholder="🔍 Ketik nama / kode mitra untuk mencari..."
              noOptionsMessage={({ inputValue }) =>
                inputValue ? 'Mitra tidak ditemukan' : 'Ketik nama mitra...'
              }
              loadingMessage={() => 'Mencari mitra di database server...'}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              styles={{
                menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                menuList: (base) => ({ ...base, maxHeight: '180px' }),
              }}
              formatOptionLabel={(option) => {
                const c = option.data;
                if (!c) return <span>{option.label}</span>;
                return (
                  <div className="flex flex-col py-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs">{c.nama}</span>
                      <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        {c.kode}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5">
                      <span className="capitalize">{c.kategori} {c.no_hp ? `• ${c.no_hp}` : ''}</span>
                      <span className="font-semibold text-blue-600 font-mono-num">
                        Saldo: {formatRupiah(c.saldo_titipan || 0)}
                      </span>
                    </div>
                  </div>
                );
              }}
            />
          </div>

          {selectedCustomer && (
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 flex flex-col gap-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Mitra Terpilih:</span>
                <span className="font-bold text-slate-900">{selectedCustomer.nama} ({selectedCustomer.kode})</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-blue-200/50">
                <span className="text-slate-600 font-medium">Saldo Tabungan Saat Ini:</span>
                <span className="font-mono-num font-black text-blue-700 text-sm">
                  {formatRupiah(selectedCustomer.saldo_titipan || 0)}
                </span>
              </div>
              {actionType === 'tarik' && Number(selectedCustomer.saldo_titipan || 0) <= 0 && (
                <p className="text-[11px] text-rose-600 font-semibold mt-0.5">
                  ⚠️ Mitra ini belum memiliki saldo tabungan untuk ditarik.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nominal {actionType === 'setor' ? 'Setoran' : 'Penarikan'} (Rp){' '}
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              required
              min="1"
              placeholder="0"
              value={form.jumlah}
              onChange={(e) => setForm({ ...form, jumlah: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-black font-mono-num text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tanggal Transaksi
            </label>
            <input
              type="date"
              value={form.tanggal}
              onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan</label>
            <input
              type="text"
              value={form.keterangan}
              onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
              placeholder="Keterangan transaksi..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-5 py-2 rounded-xl text-white font-bold text-xs shadow-sm flex items-center gap-2 ${
                actionType === 'setor'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {submitting && (
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              )}
              <span>{actionType === 'setor' ? 'Proses Setoran' : 'Proses Penarikan'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={Boolean(receiptData)}
        onClose={() => setReceiptData(null)}
        data={receiptData}
        type="titipan"
        storeInfo={storeInfo}
      />
    </div>
  );
}
