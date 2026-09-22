import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import { formatRupiah, getImageUrl } from '@/utils/formatters';
import Modal from '@/components/common/Modal';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import DebouncedSearch from '@/components/common/DebouncedSearch';
import Pagination from '@/components/common/Pagination';
import EmptyState from '@/components/common/EmptyState';
import { TableSkeleton } from '@/components/common/LoadingSkeleton';

export default function Produk() {
  const [list, setList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [kategori, setKategori] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal Create/Edit State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    kode: '',
    nama: '',
    kategori: 'Umum',
    satuan: 'pcs',
    harga_beli: '',
    harga_jual: '',
    stok: '',
    deskripsi: '',
  });
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);

  // Delete State
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Categories list
  const categoryOptions = ['Perhiasan Emas', 'Pertanian', 'Peralatan', 'Sembako', 'Umum'];

  // Fetch products
  const fetchProducts = async (page = pagination.page, limit = pagination.limit, q = search, cat = kategori) => {
    setLoading(true);
    try {
      const res = await request.get(API_ENDPOINTS.PRODUK.LIST, {
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
      toast.error('Gagal mengambil data produk');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(1, pagination.limit, search, kategori);
  }, [search, kategori]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm({
      kode: `PRD-${String(Date.now()).slice(-4)}`,
      nama: '',
      kategori: 'Umum',
      satuan: 'pcs',
      harga_beli: '',
      harga_jual: '',
      stok: '0',
      deskripsi: '',
    });
    setFotoFile(null);
    setFotoPreview(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.id);
    setForm({
      kode: item.kode,
      nama: item.nama,
      kategori: item.kategori || 'Umum',
      satuan: item.satuan || 'pcs',
      harga_beli: String(item.harga_beli),
      harga_jual: String(item.harga_jual),
      stok: String(item.stok),
      deskripsi: item.deskripsi || '',
    });
    setFotoFile(null);
    setFotoPreview(item.foto ? getImageUrl(item.foto) : null);
    setIsModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFotoFile(file);
      setFotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nama.trim()) {
      toast.error('Nama produk wajib diisi!');
      return;
    }

    setFormSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('kode', form.kode);
      formData.append('nama', form.nama);
      formData.append('kategori', form.kategori);
      formData.append('satuan', form.satuan);
      formData.append('harga_beli', form.harga_beli || 0);
      formData.append('harga_jual', form.harga_jual || 0);
      formData.append('stok', form.stok || 0);
      formData.append('deskripsi', form.deskripsi || '');
      if (fotoFile) {
        formData.append('foto', fotoFile);
      }

      let res;
      if (editingId) {
        res = await request.put(API_ENDPOINTS.PRODUK.UPDATE(editingId), formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        res = await request.post(API_ENDPOINTS.PRODUK.CREATE, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      if (res?.success) {
        toast.success(editingId ? 'Produk berhasil diperbarui!' : 'Produk baru berhasil ditambahkan!');
        setIsModalOpen(false);
        fetchProducts(pagination.page, pagination.limit, search, kategori);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan produk');
    } finally {
      setFormSubmitting(false);
    }
  };

  // State & Handler Pemulihan Produk Komoditas Sistem
  const [restoreLoading, setRestoreLoading] = useState(false);

  const handleRestoreCommodities = async () => {
    setRestoreLoading(true);
    try {
      const res = await request.post(API_ENDPOINTS.PRODUK.PULIHKAN_KOMODITAS);
      if (res?.success) {
        toast.success(res.message || 'Produk komoditas berhasil dipulihkan!');
        fetchProducts(pagination.page, pagination.limit, search, kategori);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memulihkan produk komoditas');
    } finally {
      setRestoreLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    const target = list.find((p) => p.id === deleteId);
    if (target?.kode?.startsWith('KMD-')) {
      toast.error('Produk komoditas sistem tidak dapat dihapus!');
      setDeleteId(null);
      return;
    }

    setDeleteLoading(true);
    try {
      const res = await request.delete(API_ENDPOINTS.PRODUK.DELETE(deleteId));
      if (res?.success) {
        toast.success('Produk berhasil dihapus');
        setDeleteId(null);
        fetchProducts(pagination.page, pagination.limit, search, kategori);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus produk');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Package className="w-6 h-6 text-emerald-600" />
            Data Katalog Produk & Stok
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola barang dagangan, perhiasan emas, alat perkebunan, dan stok toko kasir.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Tombol Pulihkan Komoditas Sistem */}
          <button
            type="button"
            onClick={handleRestoreCommodities}
            disabled={restoreLoading}
            title="Pulihkan dan sinkronkan 3 produk komoditas otomatis (Emas, Sawit, Karet) jika terhapus"
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs sm:text-sm shadow-2xs transition-all cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 text-amber-600 ${restoreLoading ? 'animate-spin' : ''}`} />
            <span>Pulihkan Komoditas</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Produk Baru</span>
          </button>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          <button
            type="button"
            onClick={() => setKategori('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              !kategori
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Semua Kategori
          </button>
          {categoryOptions.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setKategori(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                kategori === cat
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="w-full md:w-72">
          <DebouncedSearch
            value={search}
            onChange={(val) => setSearch(val)}
            placeholder="Cari nama produk / kode..."
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white border border-slate-200/90 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4">Produk</th>
                <th className="py-3.5 px-4">Kode</th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4 text-right">Harga Beli</th>
                <th className="py-3.5 px-4 text-right">Harga Jual</th>
                <th className="py-3.5 px-4 text-center">Stok</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
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
                      title="Belum Ada Produk"
                      description="Tambahkan produk pertama untuk mengisi etalase kasir toko."
                      actionLabel="Tambah Produk Sekarang"
                      onAction={openCreateModal}
                    />
                  </td>
                </tr>
              ) : (
                list.map((item) => {
                  const margin = item.harga_jual - item.harga_beli;
                  const isLowStock = Number(item.stok) <= 5;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {item.foto ? (
                              <img
                                src={getImageUrl(item.foto)}
                                alt={item.nama}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{item.nama}</span>
                              {item.kode?.startsWith('KMD-') && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                                  Auto-Komoditas
                                </span>
                              )}
                            </div>
                            {item.deskripsi && (
                              <div className="text-[11px] text-slate-500 truncate max-w-xs">
                                {item.deskripsi}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono-num text-slate-600 font-semibold">
                        {item.kode}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {item.kategori}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num text-slate-500">
                        {formatRupiah(item.harga_beli)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num font-bold text-emerald-700">
                        {formatRupiah(item.harga_jual)}
                        {margin > 0 && (
                          <div className="text-[10px] text-emerald-600 font-normal">
                            + {formatRupiah(margin)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 font-mono-num font-bold px-2.5 py-0.5 rounded-full text-xs ${
                            isLowStock
                              ? 'bg-rose-50 text-rose-600 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {item.stok} {item.satuan}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
                            title="Edit Produk"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {item.kode?.startsWith('KMD-') ? (
                            <span
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-400 cursor-not-allowed inline-flex items-center justify-center"
                              title="Produk komoditas sistem terproteksi (tidak dapat dihapus)"
                            >
                              <Lock className="w-4 h-4" />
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteId(item.id)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                              title="Hapus Produk"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t border-slate-100 px-4">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            limit={pagination.limit}
            onPageChange={(p) => fetchProducts(p, pagination.limit, search, kategori)}
            onLimitChange={(l) => {
              setPagination((prev) => ({ ...prev, limit: l }));
              fetchProducts(1, l, search, kategori);
            }}
          />
        </div>
      </div>

      {/* Modal Create & Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !formSubmitting && setIsModalOpen(false)}
        title={editingId ? 'Edit Data Produk' : 'Tambah Produk Baru'}
        subtitle="Masukkan rincian produk, satuan, harga, dan foto"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Foto upload preview */}
          <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="w-20 h-20 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
              {fotoPreview ? (
                <img src={fotoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-8 h-8 text-slate-300" />
              )}
            </div>

            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Foto Produk (Opsional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border file:border-slate-200 file:text-xs file:font-semibold file:bg-white file:text-slate-700 hover:file:bg-slate-50 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400 mt-1">PNG, JPG, atau WebP</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kode Produk / Barcode <span className="text-rose-500">*</span>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
              <select
                value={form.kategori}
                onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              >
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Produk <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              placeholder="Contoh: Cincin Emas 24K / Pupuk NPK"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Satuan</label>
              <input
                type="text"
                value={form.satuan}
                onChange={(e) => setForm({ ...form, satuan: e.target.value })}
                placeholder="pcs / gram / sak / kg"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Harga Beli</label>
              <input
                type="number"
                value={form.harga_beli}
                onChange={(e) => setForm({ ...form, harga_beli: e.target.value })}
                placeholder="0"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono-num text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Harga Jual <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                value={form.harga_jual}
                onChange={(e) => setForm({ ...form, harga_jual: e.target.value })}
                placeholder="0"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono-num text-emerald-700 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Stok Awal</label>
              <input
                type="number"
                step="0.001"
                value={form.stok}
                onChange={(e) => setForm({ ...form, stok: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono-num text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Deskripsi Singkat
              </label>
              <input
                type="text"
                value={form.deskripsi}
                onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                placeholder="Keterangan spesifikasi..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
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
              <span>{editingId ? 'Perbarui Produk' : 'Simpan Produk'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Produk"
        message="Apakah Anda yakin ingin menghapus produk ini dari katalog? Tindakan ini tidak dapat dibatalkan."
        loading={deleteLoading}
      />
    </div>
  );
}
