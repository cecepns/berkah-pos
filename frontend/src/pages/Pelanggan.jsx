import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  Eye,
} from 'lucide-react';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import { formatRupiah } from '@/utils/formatters';
import Modal from '@/components/common/Modal';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import DebouncedSearch from '@/components/common/DebouncedSearch';
import Pagination from '@/components/common/Pagination';
import EmptyState from '@/components/common/EmptyState';
import { TableSkeleton } from '@/components/common/LoadingSkeleton';

export default function Pelanggan() {
  const [list, setList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [kategori, setKategori] = useState('');
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [detailCustomer, setDetailCustomer] = useState(null);

  const [form, setForm] = useState({
    kode: '',
    nama: '',
    no_hp: '',
    alamat: '',
    kategori: 'Pelanggan Umum',
    catatan: '',
  });

  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const kategoriOptions = [
    'Petani Sawit',
    'Petani Karet',
    'Penjual Emas',
    'Pelanggan Umum',
  ];

  const fetchCustomers = async (page = pagination.page, limit = pagination.limit, q = search, cat = kategori) => {
    setLoading(true);
    try {
      const res = await request.get(API_ENDPOINTS.PELANGGAN.LIST, {
        page,
        limit,
        search: q,
        kategori: cat,
      });
      if (res?.success) {
        setList(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch {
      toast.error('Gagal mengambil data pelanggan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(1, pagination.limit, search, kategori);
  }, [search, kategori]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm({
      kode: `PLG-${String(Date.now()).slice(-4)}`,
      nama: '',
      no_hp: '',
      alamat: '',
      kategori: 'Pelanggan Umum',
      catatan: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.id);
    setForm({
      kode: item.kode,
      nama: item.nama,
      no_hp: item.no_hp || '',
      alamat: item.alamat || '',
      kategori: item.kategori || 'Pelanggan Umum',
      catatan: item.catatan || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nama.trim()) {
      toast.error('Nama pelanggan wajib diisi!');
      return;
    }

    setFormSubmitting(true);
    try {
      let res;
      if (editingId) {
        res = await request.put(API_ENDPOINTS.PELANGGAN.UPDATE(editingId), form);
      } else {
        res = await request.post(API_ENDPOINTS.PELANGGAN.CREATE, form);
      }

      if (res?.success) {
        toast.success(editingId ? 'Data mitra berhasil diperbarui!' : 'Mitra baru berhasil ditambahkan!');
        setIsModalOpen(false);
        fetchCustomers(pagination.page, pagination.limit, search, kategori);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan data mitra');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      const res = await request.delete(API_ENDPOINTS.PELANGGAN.DELETE(deleteId));
      if (res?.success) {
        toast.success('Mitra berhasil dihapus');
        setDeleteId(null);
        fetchCustomers(pagination.page, pagination.limit, search, kategori);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus mitra');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 shrink-0" />
            <span>Pelanggan & Mitra Petani</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
            Manajemen mitra petani sawit, karet, penjual perhiasan emas, dan pelanggan kasir toko.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden xs:inline sm:inline">Tambah Mitra Baru</span>
          <span className="xs:hidden sm:hidden">Mitra Baru</span>
        </button>
      </div>

      {/* Filter Category & Realtime Search */}
      <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-4">
        <div className="w-full md:w-72 order-1 md:order-2">
          <DebouncedSearch
            value={search}
            onChange={(val) => setSearch(val)}
            placeholder="Cari nama / kode / no hp..."
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full md:w-auto order-2 md:order-1 pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setKategori('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              !kategori
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Semua Mitra
          </button>
          {kategoriOptions.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setKategori(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                kategori === cat
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table & Mobile Cards */}
      <div className="rounded-xl sm:rounded-2xl bg-white border border-slate-200/90 overflow-hidden shadow-sm">
        {/* Mobile Card List (sm:hidden) */}
        <div className="block sm:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-4"><TableSkeleton rows={4} cols={1} /></div>
          ) : list.length === 0 ? (
            <EmptyState
              title="Belum Ada Mitra Terdaftar"
              description="Tambahkan mitra petani atau pelanggan untuk mulai mencatat transaksi dan hutang."
              actionLabel="Tambah Mitra Sekarang"
              onAction={openCreateModal}
            />
          ) : (
            list.map((item) => {
              const hasDebt = Number(item.saldo_hutang) > 0;
              const hasDeposit = Number(item.saldo_titipan) > 0;

              return (
                <div key={item.id} className="p-3.5 flex flex-col gap-2 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono-num font-bold text-xs text-slate-800">{item.kode}</span>
                      <span className="font-bold text-slate-900 text-sm truncate">{item.nama}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                      {item.kategori}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="text-slate-500 flex items-center gap-1 min-w-0">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{item.no_hp || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {hasDebt && (
                        <span className="bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded text-[10px] font-mono-num font-bold">
                          Bon: {formatRupiah(item.saldo_hutang)}
                        </span>
                      )}
                      {hasDeposit && (
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded text-[10px] font-mono-num font-bold">
                          Tab: {formatRupiah(item.saldo_titipan)}
                        </span>
                      )}
                      {!hasDebt && !hasDeposit && (
                        <span className="text-[10px] text-slate-400">Saldo Nihil</span>
                      )}
                    </div>
                  </div>

                  {item.alamat && (
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{item.alamat}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setDetailCustomer(item)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
                      title="Detail Mitra"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
                      title="Edit Mitra"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(item.id)}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors"
                      title="Hapus Mitra"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
                <th className="py-3.5 px-4">Kode & Nama</th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4">Kontak & Alamat</th>
                <th className="py-3.5 px-4 text-right">Saldo Kasbon/Hutang</th>
                <th className="py-3.5 px-4 text-right">Saldo Tabungan/Titipan</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-6">
                    <TableSkeleton rows={5} cols={6} />
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      title="Belum Ada Mitra Terdaftar"
                      description="Tambahkan mitra petani atau pelanggan untuk mulai mencatat transaksi dan hutang."
                      actionLabel="Tambah Mitra Sekarang"
                      onAction={openCreateModal}
                    />
                  </td>
                </tr>
              ) : (
                list.map((item) => {
                  const hasDebt = Number(item.saldo_hutang) > 0;
                  const hasDeposit = Number(item.saldo_titipan) > 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono-num text-[11px] text-slate-400">{item.kode}</div>
                        <div className="font-bold text-slate-900 text-sm">{item.nama}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {item.kategori}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-700 flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{item.no_hp || '-'}</span>
                        </div>
                        {item.alamat && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5 truncate max-w-xs">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{item.alamat}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num">
                        <span
                          className={`font-bold ${
                            hasDebt ? 'text-rose-600' : 'text-slate-400'
                          }`}
                        >
                          {formatRupiah(item.saldo_hutang)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num">
                        <span
                          className={`font-bold ${
                            hasDeposit ? 'text-blue-600' : 'text-slate-400'
                          }`}
                        >
                          {formatRupiah(item.saldo_titipan)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDetailCustomer(item)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
                            title="Detail Mitra"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
                            title="Edit Mitra"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteId(item.id)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors"
                            title="Hapus Mitra"
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

        <div className="border-t border-slate-100 px-4">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            limit={pagination.limit}
            onPageChange={(p) => fetchCustomers(p, pagination.limit, search, kategori)}
            onLimitChange={(l) => {
              setPagination((prev) => ({ ...prev, limit: l }));
              fetchCustomers(1, l, search, kategori);
            }}
          />
        </div>
      </div>

      {/* Modal Create & Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !formSubmitting && setIsModalOpen(false)}
        title={editingId ? 'Edit Data Mitra / Petani' : 'Pendaftaran Mitra Baru'}
        subtitle="Lengkapi identitas mitra untuk mempermudah pencatatan kasbon dan hasil bumi"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kode Mitra <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.kode}
                onChange={(e) => setForm({ ...form, kode: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono-num"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kategori Mitra
              </label>
              <select
                value={form.kategori}
                onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              >
                {kategoriOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Lengkap Mitra <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              placeholder="Contoh: Pak Haji Mansur"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nomor Telepon / WhatsApp
            </label>
            <input
              type="text"
              value={form.no_hp}
              onChange={(e) => setForm({ ...form, no_hp: e.target.value })}
              placeholder="0812-xxxx-xxxx"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono-num"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Alamat Lengkap / Lokasi Kebun
            </label>
            <textarea
              rows={2}
              value={form.alamat}
              onChange={(e) => setForm({ ...form, alamat: e.target.value })}
              placeholder="Desa Makmur Jaya RT 03 / RW 01"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan / Info Kebun
            </label>
            <input
              type="text"
              value={form.catatan}
              onChange={(e) => setForm({ ...form, catatan: e.target.value })}
              placeholder="Kebun sawit 5 hektar, langganan pupuk..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={formSubmitting}
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-2"
            >
              {formSubmitting && (
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              )}
              <span>{editingId ? 'Perbarui Mitra' : 'Daftarkan Mitra'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Detail Mitra */}
      <Modal
        isOpen={Boolean(detailCustomer)}
        onClose={() => setDetailCustomer(null)}
        title="Kartu Profil Mitra / Petani"
        subtitle="Rincian data pelanggan, saldo kasbon, dan simpanan tabungan"
        maxWidth="max-w-md"
      >
        {detailCustomer && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-mono-num">
                  {detailCustomer.kode}
                </span>
                <h3 className="text-base font-bold text-slate-900">{detailCustomer.nama}</h3>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {detailCustomer.kategori}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                <div className="text-[11px] text-rose-800 font-semibold mb-1">
                  Saldo Hutang / Kasbon
                </div>
                <div className="text-lg font-black text-rose-600 font-mono-num">
                  {formatRupiah(detailCustomer.saldo_hutang)}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200">
                <div className="text-[11px] text-blue-800 font-semibold mb-1">
                  Saldo Tabungan Titipan
                </div>
                <div className="text-lg font-black text-blue-600 font-mono-num">
                  {formatRupiah(detailCustomer.saldo_titipan)}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Telepon / HP:</span>
                <span className="text-slate-800 font-mono-num font-medium">{detailCustomer.no_hp || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Alamat:</span>
                <span className="text-slate-800 text-right">{detailCustomer.alamat || '-'}</span>
              </div>
              {detailCustomer.catatan && (
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span className="text-slate-500">Catatan:</span>
                  <span className="text-slate-700 text-right">{detailCustomer.catatan}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDetailCustomer(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
              >
                Tutup Profil
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Data Mitra"
        message="Apakah Anda yakin ingin menghapus data mitra ini? Data transaksi terkait mitra mungkin terpengaruh."
        loading={deleteLoading}
      />
    </div>
  );
}
