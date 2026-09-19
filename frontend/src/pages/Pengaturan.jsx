import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Settings,
  Store,
  TrendingUp,
  Printer,
  Save,
  AlertTriangle,
  RotateCcw,
  Trash2,
  ShieldAlert,
  CheckCircle2,
  Terminal,
} from 'lucide-react';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import { formatRupiah } from '@/utils/formatters';
import Modal from '@/components/common/Modal';

export default function Pengaturan() {
  const { storeInfo, refreshStoreInfo } = useOutletContext();

  const [form, setForm] = useState({
    nama_toko: '',
    tagline: '',
    alamat: '',
    no_telepon: '',
    footer_struk: '',
    harga_emas_24k: '',
    harga_sawit_kg: '',
    harga_karet_kg: '',
    printer_tipe: 'bluetooth',
    printer_lebar: '58mm',
  });

  const [saving, setSaving] = useState(false);
  const [isResetTransaksiModalOpen, setIsResetTransaksiModalOpen] = useState(false);
  const [isResetTotalModalOpen, setIsResetTotalModalOpen] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [resetting, setResetting] = useState(false);

  const handleResetTransaksi = async () => {
    setResetting(true);
    try {
      const res = await request.post(API_ENDPOINTS.RESET.TRANSAKSI);
      if (res?.success) {
        toast.success(res.message || 'Riwayat transaksi berhasil di-reset!');
        setIsResetTransaksiModalOpen(false);
        if (refreshStoreInfo) refreshStoreInfo();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mereset transaksi');
    } finally {
      setResetting(false);
    }
  };

  const handleResetTotal = async (e) => {
    e.preventDefault();
    if (confirmPhrase !== 'RESET-TOTAL') {
      toast.error('Ketik teks konfirmasi "RESET-TOTAL" dengan benar!');
      return;
    }

    setResetting(true);
    try {
      const res = await request.post(API_ENDPOINTS.RESET.TOTAL);
      if (res?.success) {
        toast.success(res.message || 'Database berhasil di-reset total ke pengaturan awal!');
        setIsResetTotalModalOpen(false);
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal reset total database');
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    if (storeInfo) {
      setForm({
        nama_toko: storeInfo.nama_toko || '',
        tagline: storeInfo.tagline || '',
        alamat: storeInfo.alamat || '',
        no_telepon: storeInfo.no_telepon || '',
        footer_struk: storeInfo.footer_struk || '',
        harga_emas_24k: String(storeInfo.harga_emas_24k || ''),
        harga_sawit_kg: String(storeInfo.harga_sawit_kg || ''),
        harga_karet_kg: String(storeInfo.harga_karet_kg || ''),
        printer_tipe: storeInfo.printer_tipe || 'bluetooth',
        printer_lebar: storeInfo.printer_lebar || '58mm',
      });
    }
  }, [storeInfo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        nama_toko: form.nama_toko,
        tagline: form.tagline,
        alamat: form.alamat,
        no_telepon: form.no_telepon,
        footer_struk: form.footer_struk,
        harga_emas_24k: Number(form.harga_emas_24k) || 0,
        harga_sawit_kg: Number(form.harga_sawit_kg) || 0,
        harga_karet_kg: Number(form.harga_karet_kg) || 0,
        printer_tipe: form.printer_tipe,
        printer_lebar: form.printer_lebar,
      };

      const res = await request.put(API_ENDPOINTS.PENGATURAN.UPDATE, payload);
      if (res?.success) {
        toast.success('Pengaturan toko & harga komoditas berhasil diperbarui!');
        if (refreshStoreInfo) {
          refreshStoreInfo();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-emerald-600" />
          Pengaturan Toko & Harga Patokan Pasar
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Atur identitas nota struk kasir, format printer thermal, dan harga dasar pembelian komoditas harian.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Harga Komoditas Harian */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-base font-bold text-slate-900">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            <span>Harga Dasar Pembelian Komoditas Harian</span>
          </div>
          <p className="text-xs text-slate-500">
            Harga ini akan otomatis menjadi nilai acuan standar saat Anda menimbang dan mencatat pembelian hasil bumi atau emas.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60 space-y-2">
              <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider">
                Emas Murni 24K (per gram)
              </label>
              <input
                type="number"
                required
                value={form.harga_emas_24k}
                onChange={(e) => setForm({ ...form, harga_emas_24k: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold font-mono-num text-slate-900 focus:outline-none focus:border-amber-500"
              />
              <p className="text-[11px] text-amber-700 font-mono-num font-semibold">
                Setara: {formatRupiah(form.harga_emas_24k || 0)} / gram
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/60 space-y-2">
              <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Kelapa Sawit TBS (per kg)
              </label>
              <input
                type="number"
                required
                value={form.harga_sawit_kg}
                onChange={(e) => setForm({ ...form, harga_sawit_kg: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold font-mono-num text-slate-900 focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-emerald-700 font-mono-num font-semibold">
                Setara: {formatRupiah(form.harga_sawit_kg || 0)} / kg
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-cyan-50/60 border border-cyan-200/60 space-y-2">
              <label className="block text-xs font-bold text-cyan-800 uppercase tracking-wider">
                Karet Rakyat (per kg)
              </label>
              <input
                type="number"
                required
                value={form.harga_karet_kg}
                onChange={(e) => setForm({ ...form, harga_karet_kg: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold font-mono-num text-slate-900 focus:outline-none focus:border-cyan-500"
              />
              <p className="text-[11px] text-cyan-700 font-mono-num font-semibold">
                Setara: {formatRupiah(form.harga_karet_kg || 0)} / kg
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Identitas Toko & Kasir */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Store className="w-5 h-5 text-emerald-600" />
            <span>Identitas Toko & Profil Struk</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Toko / Usaha <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.nama_toko}
                onChange={(e) => setForm({ ...form, nama_toko: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tagline / Slogan Usaha
              </label>
              <input
                type="text"
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor Telepon / WhatsApp
              </label>
              <input
                type="text"
                value={form.no_telepon}
                onChange={(e) => setForm({ ...form, no_telepon: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono-num"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Lengkap Toko
              </label>
              <input
                type="text"
                value={form.alamat}
                onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pesan Footer Struk Nota
            </label>
            <textarea
              rows={3}
              value={form.footer_struk}
              onChange={(e) => setForm({ ...form, footer_struk: e.target.value })}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Card 3: Konfigurasi Printer Struk */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Printer className="w-5 h-5 text-emerald-600" />
            <span>Format & Lebar Kertas Printer Thermal</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipe Koneksi Printer
              </label>
              <select
                value={form.printer_tipe}
                onChange={(e) => setForm({ ...form, printer_tipe: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              >
                <option value="bluetooth">Bluetooth Thermal Printer (Portable)</option>
                <option value="browser">Browser Native Print Dialog</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lebar Kertas Thermal
              </label>
              <select
                value={form.printer_lebar}
                onChange={(e) => setForm({ ...form, printer_lebar: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              >
                <option value="58mm">58mm (Standar Kasir Portable)</option>
                <option value="80mm">80mm (Desktop Thermal Printer)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {saving ? (
              <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Simpan Semua Pengaturan</span>
          </button>
        </div>
      </form>

      {/* Card 4: Pemeliharaan Sistem & Reset Database */}
      <div className="p-6 rounded-3xl bg-white border border-rose-200/90 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-base font-bold text-slate-900">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <span>Pemeliharaan Sistem & Reset Database</span>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
            Area Khusus Bos / Admin
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Gunakan fitur ini jika ingin membersihkan transaksi latihan/demo atau mengembalikan seluruh sistem ke pengaturan awal pabrik.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Option 1: Reset Transaksi Saja */}
          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-amber-600" />
                  Reset Riwayat Transaksi Saja
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Master Data Aman
                </span>
              </div>
              <p className="text-[11.5px] text-slate-600 mt-2 leading-relaxed">
                Menghapus semua riwayat transaksi kasir, timbang beli komoditas, catatan hutang/kasbon, tabungan titipan, dan mutasi kas toko.
                <strong className="block mt-1 text-slate-800">
                  Data master produk, daftar pelanggan, profil toko, dan akun pegawai TETAP AMAN.
                </strong>
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsResetTransaksiModalOpen(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Bersihkan Riwayat Transaksi</span>
            </button>
          </div>

          {/* Option 2: Reset Total / Factory Reset */}
          <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200/80 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  Reset Total (Factory Reset)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                  Seluruh Data Terhapus
                </span>
              </div>
              <p className="text-[11.5px] text-slate-600 mt-2 leading-relaxed">
                Mengembalikan database ke kondisi awal instalasi dari file <code className="bg-rose-100 px-1 py-0.5 rounded text-rose-900 font-mono">database.sql</code>.
                <strong className="block mt-1 text-rose-700">
                  Seluruh transaksi, produk kustom, pelanggan, dan akun pengguna tambahan akan dihapus bersih.
                </strong>
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setConfirmPhrase('');
                setIsResetTotalModalOpen(true);
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Total ke Awal (Factory Reset)</span>
            </button>
          </div>
        </div>

        {/* Box Panduan Manual MySQL */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
          <div className="font-bold text-slate-700 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-slate-500" />
            <span>Panduan Reset Manual via Command Line / phpMyAdmin:</span>
          </div>
          <div className="font-mono text-[11px] bg-slate-900 text-slate-100 p-2.5 rounded-lg overflow-x-auto">
            mysql -u root -p berkah_pos &lt; backend/sql/database.sql
          </div>
          <p className="text-[11px] text-slate-500">
            Atau buka phpMyAdmin / HeidiSQL, pilih database <code className="font-mono">berkah_pos</code>, lalu Import file <code className="font-mono">backend/sql/database.sql</code>.
          </p>
        </div>
      </div>

      {/* Modal Konfirmasi: Reset Transaksi Saja */}
      <Modal
        isOpen={isResetTransaksiModalOpen}
        onClose={() => !resetting && setIsResetTransaksiModalOpen(false)}
        title="Konfirmasi Reset Riwayat Transaksi"
        subtitle="Tindakan ini akan mengosongkan seluruh riwayat penjualan, pembelian, hutang, dan kas"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Apakah Anda yakin ingin mereset transaksi?</span>
            </div>
            <p>
              Data pelanggan dan master produk tidak akan terhapus. Seluruh riwayat transaksi akan dihapus dan saldo kasbon pelanggan akan dinetralkan kembali ke 0.
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              disabled={resetting}
              onClick={() => setIsResetTransaksiModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={resetting}
              onClick={handleResetTransaksi}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {resetting ? (
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5" />
              )}
              <span>Ya, Reset Transaksi Sekarang</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Konfirmasi: Factory Reset Total */}
      <Modal
        isOpen={isResetTotalModalOpen}
        onClose={() => !resetting && setIsResetTotalModalOpen(false)}
        title="Peringatan Kritis: Factory Reset Total"
        subtitle="Mengembalikan database ke kondisi awal instalasi pabrik"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleResetTotal} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-rose-700">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>PERHATIAN: Tindakan ini tidak dapat dibatalkan!</span>
            </div>
            <p>
              Seluruh data kustom termasuk produk tambahan, mitra pelanggan baru, dan akun pegawai akan dihapus. Database akan dikembalikan ke data default bawaan sistem.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ketik <span className="text-rose-600 font-mono">RESET-TOTAL</span> untuk melanjutkan:
            </label>
            <input
              type="text"
              required
              value={confirmPhrase}
              onChange={(e) => setConfirmPhrase(e.target.value)}
              placeholder="RESET-TOTAL"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              disabled={resetting}
              onClick={() => setIsResetTotalModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={resetting || confirmPhrase !== 'RESET-TOTAL'}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {resetting ? (
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>Eksekusi Reset Total</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
