import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Settings,
  Store,
  TrendingUp,
  Printer,
  Save,
} from 'lucide-react';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import { formatRupiah } from '@/utils/formatters';

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
    </div>
  );
}
