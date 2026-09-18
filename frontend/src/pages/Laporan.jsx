import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  BarChart3,
  Calendar,
  Printer,
  Scale,
  ShoppingCart,
  CreditCard,
  TrendingUp,
} from 'lucide-react';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import { formatRupiah, formatWeight } from '@/utils/formatters';
import { CardSkeleton } from '@/components/common/LoadingSkeleton';

export default function Laporan() {
  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await request.get(API_ENDPOINTS.LAPORAN.PERIODIK, {
        startDate,
        endDate,
      });
      if (res?.success) {
        setReport(res.data);
      }
    } catch {
      toast.error('Gagal mengambil laporan periodik');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate]);

  const handlePrint = () => {
    window.print();
  };

  const setRangeQuick = (type) => {
    const d = new Date();
    if (type === 'hari_ini') {
      const t = d.toISOString().split('T')[0];
      setStartDate(t);
      setEndDate(t);
    } else if (type === '7_hari') {
      const past = new Date(d.setDate(d.getDate() - 7)).toISOString().split('T')[0];
      setStartDate(past);
      setEndDate(today);
    } else if (type === 'bulan_ini') {
      setStartDate(firstDayOfMonth);
      setEndDate(today);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-emerald-600" />
            Laporan & Rekap Transaksi
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Rekapitulasi omzet kasir toko, pembelian komoditas hasil bumi, kasbon, dan simpanan tabungan.
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm border border-slate-200 shadow-2xs transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>Cetak Dokumen Laporan</span>
        </button>
      </div>

      {/* Date Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setRangeQuick('hari_ini')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200"
          >
            Hari Ini
          </button>
          <button
            type="button"
            onClick={() => setRangeQuick('7_hari')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200"
          >
            7 Hari Terakhir
          </button>
          <button
            type="button"
            onClick={() => setRangeQuick('bulan_ini')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200"
          >
            Bulan Ini
          </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>Dari:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono-num"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Sampai:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono-num"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="space-y-6">
          {/* 4 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Pembelian Komoditas */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 uppercase font-bold">
                  Beli Komoditas
                </span>
                <Scale className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono-num mb-1">
                {formatRupiah(report?.pembelian?.total_pengeluaran || 0)}
              </div>
              <div className="text-xs text-slate-400">
                {report?.pembelian?.total_transaksi || 0} kali penimbangan
              </div>
            </div>

            {/* 2. Penjualan Toko */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 uppercase font-bold">
                  Penjualan Kasir
                </span>
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-600 font-mono-num mb-1">
                {formatRupiah(report?.penjualan?.total_omzet || 0)}
              </div>
              <div className="text-xs text-slate-400">
                {report?.penjualan?.total_transaksi || 0} nota transaksi
              </div>
            </div>

            {/* 3. Kasbon Baru */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 uppercase font-bold">
                  Kasbon Diberikan
                </span>
                <CreditCard className="w-5 h-5 text-rose-600" />
              </div>
              <div className="text-2xl font-black text-rose-600 font-mono-num mb-1">
                {formatRupiah(report?.hutang_baru?.total_kasbon || 0)}
              </div>
              <div className="text-xs text-slate-400">
                {report?.hutang_baru?.total_transaksi || 0} catatan pinjaman
              </div>
            </div>

            {/* 4. Pembayaran Kasbon Diterima */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 uppercase font-bold">
                  Kasbon Terbayar
                </span>
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-600 font-mono-num mb-1">
                {formatRupiah(report?.pembayaran_hutang?.total_diterima || 0)}
              </div>
              <div className="text-xs text-slate-400">
                {report?.pembayaran_hutang?.total_transaksi || 0} pelunasan
              </div>
            </div>
          </div>

          {/* Volume Komoditas Diterima */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-500" />
              Rincian Volume Hasil Bumi Periode Terpilih
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60">
                <div className="text-xs text-amber-800 font-bold mb-1">EMAS MURNI / LEBURAN</div>
                <div className="text-2xl font-black text-slate-900 font-mono-num">
                  {formatWeight(report?.pembelian?.emas_gram || 0, 'gram')}
                </div>
                <div className="text-[11px] text-amber-700 mt-1">Presisi 3 desimal (0.000 gr)</div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/60">
                <div className="text-xs text-emerald-800 font-bold mb-1">KELAPA SAWIT (TBS)</div>
                <div className="text-2xl font-black text-slate-900 font-mono-num">
                  {formatWeight(report?.pembelian?.sawit_kg || 0, 'kg')}
                </div>
                <div className="text-[11px] text-emerald-700 mt-1">
                  ± {((report?.pembelian?.sawit_kg || 0) / 1000).toFixed(2)} Ton
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-cyan-50/60 border border-cyan-200/60">
                <div className="text-xs text-cyan-800 font-bold mb-1">KARET RAKYAT</div>
                <div className="text-2xl font-black text-slate-900 font-mono-num">
                  {formatWeight(report?.pembelian?.karet_kg || 0, 'kg')}
                </div>
                <div className="text-[11px] text-cyan-700 mt-1">Netto setelah potongan DRC</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
