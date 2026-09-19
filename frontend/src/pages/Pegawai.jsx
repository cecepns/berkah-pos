import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  UserCheck,
  Plus,
  Edit2,
  Trash2,
  Shield,
  User,
  CheckCircle2,
  XCircle,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import { formatDate } from '@/utils/formatters';
import Modal from '@/components/common/Modal';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import DebouncedSearch from '@/components/common/DebouncedSearch';
import Pagination from '@/components/common/Pagination';
import EmptyState from '@/components/common/EmptyState';
import { TableSkeleton } from '@/components/common/LoadingSkeleton';

export default function Pegawai() {
  const { user: currentUser } = useAuth();

  const [list, setList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [form, setForm] = useState({
    nama: '',
    username: '',
    password: '',
    role: 'kasir',
    status: 'aktif',
  });

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchUsers = async (
    page = pagination.page,
    limit = pagination.limit,
    q = search,
    r = roleFilter,
    s = statusFilter
  ) => {
    setLoading(true);
    try {
      const res = await request.get(API_ENDPOINTS.USERS.LIST, {
        page,
        limit,
        search: q,
        role: r,
        status: s,
      });
      if (res?.success) {
        setList(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memuat data pegawai');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1, pagination.limit, search, roleFilter, statusFilter);
  }, [search, roleFilter, statusFilter]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm({
      nama: '',
      username: '',
      password: '',
      role: 'kasir',
      status: 'aktif',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.id);
    setForm({
      nama: item.nama,
      username: item.username,
      password: '', // Kosongkan, hanya diisi jika ganti password
      role: item.role,
      status: item.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.nama.trim() || !form.username.trim()) {
      toast.error('Nama dan username pegawai wajib diisi!');
      return;
    }

    if (!editingId && !form.password) {
      toast.error('Password akun baru wajib diisi!');
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingId) {
        // Update user
        const payload = {
          nama: form.nama.trim(),
          username: form.username.trim(),
          role: form.role,
          status: form.status,
        };
        if (form.password.trim() !== '') {
          payload.password = form.password.trim();
        }

        const res = await request.put(API_ENDPOINTS.USERS.UPDATE(editingId), payload);
        if (res?.success) {
          toast.success('Data pegawai berhasil diperbarui!');
          setIsModalOpen(false);
          fetchUsers(pagination.page, pagination.limit, search, roleFilter, statusFilter);
        }
      } else {
        // Create user
        const payload = {
          nama: form.nama.trim(),
          username: form.username.trim(),
          password: form.password.trim(),
          role: form.role,
          status: form.status,
        };

        const res = await request.post(API_ENDPOINTS.USERS.CREATE, payload);
        if (res?.success) {
          toast.success('Akun pegawai baru berhasil ditambahkan!');
          setIsModalOpen(false);
          fetchUsers(1, pagination.limit, search, roleFilter, statusFilter);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan data pegawai');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await request.delete(API_ENDPOINTS.USERS.DELETE(deleteTarget.id));
      if (res?.success) {
        toast.success(res.message || 'Akun pegawai berhasil dihapus');
        setDeleteTarget(null);
        fetchUsers(pagination.page, pagination.limit, search, roleFilter, statusFilter);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus pegawai');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Metrik statistik pegawai
  const totalPegawai = pagination.total || list.length;
  const countBos = list.filter((u) => u.role === 'admin').length;
  const countKaryawan = list.filter((u) => u.role === 'kasir').length;
  const countAktif = list.filter((u) => u.status === 'aktif').length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 shrink-0" />
            <span>Manajemen Pegawai</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
            Kelola hak akses akun pengguna untuk level Bos (Pemilik/Admin) dan Karyawan (Kasir/Staff).
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden xs:inline sm:inline">Tambah Pegawai Baru</span>
          <span className="xs:hidden sm:hidden">Pegawai Baru</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Total Pegawai
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono-num">
            {totalPegawai}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 hidden sm:block">Pengguna terdaftar</div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-purple-50/60 border border-purple-200/70 shadow-2xs">
          <div className="text-[10px] sm:text-[11px] font-bold text-purple-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span>Bos / Admin</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-900 font-mono-num">
            {countBos}
          </div>
          <div className="text-[10px] sm:text-[11px] text-purple-600 mt-0.5 hidden sm:block">Akses penuh seluruh sistem</div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-blue-50/60 border border-blue-200/70 shadow-2xs">
          <div className="text-[10px] sm:text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            <span>Karyawan</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-900 font-mono-num">
            {countKaryawan}
          </div>
          <div className="text-[10px] sm:text-[11px] text-blue-600 mt-0.5 hidden sm:block">Akses kasir & timbang</div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-50/60 border border-emerald-200/70 shadow-2xs">
          <div className="text-[10px] sm:text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Aktif</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-900 font-mono-num">
            {countAktif}
          </div>
          <div className="text-[10px] sm:text-[11px] text-emerald-600 mt-0.5 hidden sm:block">Bisa login aplikasi</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center justify-between">
        <div className="w-full sm:w-80">
          <DebouncedSearch
            value={search}
            onChange={(val) => setSearch(val)}
            placeholder="Cari nama atau username pegawai..."
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="flex-1 sm:w-44 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500"
          >
            <option value="">Semua Level Akses</option>
            <option value="admin">Bos (Admin)</option>
            <option value="kasir">Karyawan (Kasir)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 sm:w-36 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500"
          >
            <option value="">Semua Status</option>
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Table Data Pegawai & Mobile Cards */}
      <div className="rounded-xl sm:rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden">
        {loading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : list.length === 0 ? (
          <EmptyState
            title="Tidak Ada Data Pegawai"
            message={
              search
                ? `Tidak ditemukan pegawai dengan kata kunci "${search}"`
                : 'Belum ada data pegawai yang terdaftar. Klik "Tambah Pegawai Baru" untuk menambahkan.'
            }
          />
        ) : (
          <>
            {/* Mobile Cards (sm:hidden) */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {list.map((item) => {
                const isSelf = currentUser?.id === item.id;
                const isBos = item.role === 'admin';

                return (
                  <div key={item.id} className="p-3.5 flex flex-col gap-2 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                            isBos ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.nama?.charAt(0) || 'P'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5 truncate">
                            <span className="truncate">{item.nama}</span>
                            {isSelf && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-600 font-semibold shrink-0">
                                Anda
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">@{item.username}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isSelf}
                          onClick={() => setDeleteTarget(item)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isSelf
                              ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                              : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-50 text-xs">
                      {isBos ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          <Shield className="w-3 h-3 text-purple-600" />
                          <span>Bos (Admin)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          <User className="w-3 h-3 text-blue-600" />
                          <span>Karyawan</span>
                        </span>
                      )}

                      {item.status === 'aktif' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Aktif</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          <span>Nonaktif</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table (hidden sm:block) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-semibold">
                  <th className="py-3.5 px-4 w-12">No</th>
                  <th className="py-3.5 px-4">Pegawai</th>
                  <th className="py-3.5 px-4">Username Login</th>
                  <th className="py-3.5 px-4">Level Akses (Role)</th>
                  <th className="py-3.5 px-4">Status Akun</th>
                  <th className="py-3.5 px-4">Didaftarkan</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((item, idx) => {
                  const isSelf = currentUser?.id === item.id;
                  const isBos = item.role === 'admin';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-slate-400 font-mono-num">
                        {(pagination.page - 1) * pagination.limit + idx + 1}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase shadow-2xs ${
                              isBos
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {item.nama?.charAt(0) || 'P'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{item.nama}</span>
                              {isSelf && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-600 font-semibold">
                                  Anda
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">ID #{item.id}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                        @{item.username}
                      </td>

                      <td className="py-3.5 px-4">
                        {isBos ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <Shield className="w-3.5 h-3.5 text-purple-600" />
                            <span>Bos (Admin)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            <User className="w-3.5 h-3.5 text-blue-600" />
                            <span>Karyawan (Kasir)</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {item.status === 'aktif' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Aktif</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>Nonaktif</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 font-mono-num text-[11.5px]">
                        {formatDate(item.created_at || new Date().toISOString())}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="p-2 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                            title="Edit Data Pegawai"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => setDeleteTarget(item)}
                            className={`p-2 rounded-xl transition-colors ${
                              isSelf
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-500 hover:text-rose-700 hover:bg-rose-50'
                            }`}
                            title={isSelf ? 'Tidak dapat menghapus akun sendiri' : 'Hapus Pegawai'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}

        {/* Pagination */}
        {!loading && list.length > 0 && (
          <div className="p-4 border-t border-slate-100">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              limit={pagination.limit}
              onPageChange={(p) => fetchUsers(p, pagination.limit, search, roleFilter, statusFilter)}
              onLimitChange={(l) => fetchUsers(1, l, search, roleFilter, statusFilter)}
            />
          </div>
        )}
      </div>

      {/* Modal Tambah / Edit Pegawai */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !formSubmitting && setIsModalOpen(false)}
        title={editingId ? 'Edit Data Pegawai' : 'Tambah Pegawai Baru'}
        subtitle={
          editingId
            ? 'Perbarui informasi profil, level akses, atau ganti password akun'
            : 'Buat akun login baru untuk Bos atau Karyawan'
        }
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nama Lengkap */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Lengkap Pegawai <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              placeholder="Misal: Ahmad Fauzi"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Username Login <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().trim() })}
              placeholder="Misal: fauzi_kasir"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">Gunakan huruf kecil tanpa spasi.</p>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password {editingId ? '(Kosongkan jika tidak diubah)' : <span className="text-rose-500">*</span>}
            </label>
            <div className="relative">
              <input
                type="password"
                required={!editingId}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editingId ? '•••••••• (Tetap sama)' : 'Masukkan password login'}
                className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          {/* Role & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Level Akses (Role)
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-semibold"
              >
                <option value="kasir">👤 Karyawan (Kasir)</option>
                <option value="admin">👑 Bos (Admin)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Akun
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-semibold"
              >
                <option value="aktif">🟢 Aktif</option>
                <option value="nonaktif">🔴 Nonaktif</option>
              </select>
            </div>
          </div>

          {/* Role Explanation Note */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
            {form.role === 'admin' ? (
              <div>
                <strong className="text-purple-700">Akses Bos (Admin):</strong> Memiliki akses menyeluruh ke Buku Kas Toko, Laporan Finansial Rekapitulasi, Pengaturan Toko, Reset Data, dan Manajemen Pegawai.
              </div>
            ) : (
              <div>
                <strong className="text-blue-700">Akses Karyawan (Kasir):</strong> Dikhususkan untuk operasional penjualan kasir toko, pembelian komoditas sawit/karet/emas, serta pencatatan kasbon dan tabungan pelanggan.
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-2 justify-end pt-3">
            <button
              type="button"
              disabled={formSubmitting}
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {formSubmitting && (
                <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              )}
              <span>{editingId ? 'Simpan Perubahan' : 'Tambah Pegawai'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Dialog Konfirmasi Hapus */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => !deleteLoading && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Akun Pegawai"
        message={`Apakah Anda yakin ingin menghapus akun pegawai "${deleteTarget?.nama}" (@${deleteTarget?.username})? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus Akun"
        cancelText="Batal"
        loading={deleteLoading}
      />
    </div>
  );
}
