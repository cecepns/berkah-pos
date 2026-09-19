import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  BarChart3,
  Calendar,
  Printer,
  Scale,
  ShoppingCart,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
  PackageCheck,
} from 'lucide-react';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import { formatRupiah, formatWeight, formatDate } from '@/utils/formatters';
import { CardSkeleton } from '@/components/common/LoadingSkeleton';
import EmptyState from '@/components/common/EmptyState';

export default function Laporan() {
  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [reportList, setReportList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await request.get(API_ENDPOINTS.LAPORAN.PERIODIK, {
        startDate,
        endDate,
        periode: 'harian',
      });
      if (res?.success) {
        setReportList(res.data || []);
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
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(today);
    } else if (type === 'bulan_ini') {
      setStartDate(firstDayOfMonth);
      setEndDate(today);
    }
  };

  // Kalkulasi agregat dari data periodik
  const totalBeli = reportList.reduce((acc, row) => acc + (parseFloat(row.beli) || 0), 0);
  const totalJual = reportList.reduce((acc, row) => acc + (parseFloat(row.jual) || 0), 0);
  const totalEmas = reportList.reduce((acc, row) => acc + (parseFloat(row.emas_gr) || 0), 0);
  const totalSawit = reportList.reduce((acc, row) => acc + (parseFloat(row.sawit_kg) || 0), 0);
  const totalKaret = reportList.reduce((acc, row) => acc + (parseFloat(row.karet_kg) || 0), 0);
  const totalJualEmas = reportList.reduce((acc, row) => acc + (parseFloat(row.jual_emas_gr) || 0), 0);
  const totalJualSawit = reportList.reduce((acc, row) => acc + (parseFloat(row.jual_sawit_kg) || 0), 0);
  const totalJualKaret = reportList.reduce((acc, row) => acc + (parseFloat(row.jual_karet_kg) || 0), 0);
  const totalQtyJual = reportList.reduce((acc, row) => acc + (parseFloat(row.total_qty_jual) || 0), 0);
  const selisihKas = totalJual - totalBeli;

  const hariAdaBeli = reportList.filter((r) => parseFloat(r.beli) > 0).length;
  const hariAdaJual = reportList.filter((r) => parseFloat(r.jual) > 0).length;

  return (
    <div id="report-printable" className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 shrink-0" />
            <span>Laporan & Rekap Transaksi</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
            Rekapitulasi pembelian komoditas hasil bumi, omzet kasir toko, dan mutasi volume komoditas.
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="no-print flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm border border-slate-200 shadow-2xs transition-all shrink-0 cursor-pointer"
        >
          <Printer className="w-4 h-4 text-emerald-600" />
          <span className="hidden sm:inline">Cetak Dokumen Laporan</span>
          <span className="sm:hidden">Cetak</span>
        </button>
      </div>

      {/* Date Filter Bar */}
      <div className="no-print p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full md:w-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setRangeQuick('hari_ini')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition-colors whitespace-nowrap"
          >
            Hari Ini
          </button>
          <button
            type="button"
            onClick={() => setRangeQuick('7_hari')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition-colors whitespace-nowrap"
          >
            7 Hari
          </button>
          <button
            type="button"
            onClick={() => setRangeQuick('bulan_ini')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition-colors whitespace-nowrap"
          >
            Bulan Ini
          </button>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto">
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

      {/* Print-Only Title */}
      <div className="hidden print:block text-center border-b pb-4 mb-4">
        <h1 className="text-xl font-bold uppercase">Laporan Rekapitulasi Transaksi</h1>
        <p className="text-xs text-slate-600">
          Periode: {formatDate(startDate)} s/d {formatDate(endDate)}
        </p>
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
              <div className="text-2xl font-black text-amber-600 font-mono-num mb-1">
                {formatRupiah(totalBeli)}
              </div>
              <div className="text-xs text-slate-400">
                {hariAdaBeli} hari transaksi pembelian
              </div>
            </div>

            {/* 2. Penjualan Kasir */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 uppercase font-bold">
                  Penjualan Kasir
                </span>
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-600 font-mono-num mb-1">
                {formatRupiah(totalJual)}
              </div>
              <div className="text-xs text-slate-400">
                {hariAdaJual} hari transaksi penjualan
              </div>
            </div>

            {/* 3. Arus Kas Bersih */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 uppercase font-bold">
                  Arus Kas Bersih (Jual - Beli)
                </span>
                {selisihKas >= 0 ? (
                  <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 text-rose-600" />
                )}
              </div>
              <div
                className={`text-2xl font-black font-mono-num mb-1 ${
                  selisihKas >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {formatRupiah(selisihKas)}
              </div>
              <div className="text-xs text-slate-400">
                {selisihKas >= 0 ? 'Surplus operasional' : 'Defisit (pengeluaran beli lebih besar)'}
              </div>
            </div>

            {/* 4. Total Volume Penjualan */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 uppercase font-bold">
                  Total Volume Penjualan
                </span>
                <PackageCheck className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-indigo-600 font-mono-num mb-1">
                {totalQtyJual.toLocaleString('id-ID')} <span className="text-sm font-semibold text-slate-500">Unit / Item</span>
              </div>
              <div className="text-xs text-slate-400 truncate" title={`${reportList.length} hari rekap aktif`}>
                Total volume fisik keluar kasir ({reportList.length} hari rekap)
              </div>
            </div>
          </div>

          {/* Volume Komoditas Masuk (Beli) vs Keluar (Jual) */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-500" />
              Volume Mutasi Pembelian & Penjualan Periode Terpilih
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Emas */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/70 space-y-2">
                <div className="flex items-center justify-between text-xs text-amber-900 font-bold">
                  <span>EMAS MURNI / LEBURAN</span>
                  <span className="text-[10px] bg-amber-200/80 px-1.5 py-0.5 rounded font-mono">0.000 gr</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-amber-800">Total Beli (In):</span>
                    <span className="font-bold text-slate-900 font-mono-num">{formatWeight(totalEmas, 'gram')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-700">Terjual (Out):</span>
                    <span className="font-bold text-emerald-700 font-mono-num">{formatWeight(totalJualEmas, 'gram')}</span>
                  </div>
                  <div className="border-t border-amber-200 pt-1 flex justify-between font-semibold">
                    <span className="text-slate-600">Selisih Stok:</span>
                    <span className={`font-mono-num ${totalEmas - totalJualEmas >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                      {formatWeight(totalEmas - totalJualEmas, 'gram')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sawit */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 space-y-2">
                <div className="flex items-center justify-between text-xs text-emerald-900 font-bold">
                  <span>KELAPA SAWIT (TBS)</span>
                  <span className="text-[10px] bg-emerald-200/80 px-1.5 py-0.5 rounded font-mono">Kg</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-emerald-800">Total Beli (In):</span>
                    <span className="font-bold text-slate-900 font-mono-num">{formatWeight(totalSawit, 'kg')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-700">Terjual (Out):</span>
                    <span className="font-bold text-emerald-700 font-mono-num">{formatWeight(totalJualSawit, 'kg')}</span>
                  </div>
                  <div className="border-t border-emerald-200 pt-1 flex justify-between font-semibold">
                    <span className="text-slate-600">Selisih Stok:</span>
                    <span className={`font-mono-num ${totalSawit - totalJualSawit >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                      {formatWeight(totalSawit - totalJualSawit, 'kg')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Karet */}
              <div className="p-4 rounded-2xl bg-cyan-50/70 border border-cyan-200/70 space-y-2">
                <div className="flex items-center justify-between text-xs text-cyan-900 font-bold">
                  <span>KARET RAKYAT</span>
                  <span className="text-[10px] bg-cyan-200/80 px-1.5 py-0.5 rounded font-mono">Kg DRC</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-cyan-800">Total Beli (In):</span>
                    <span className="font-bold text-slate-900 font-mono-num">{formatWeight(totalKaret, 'kg')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-700">Terjual (Out):</span>
                    <span className="font-bold text-emerald-700 font-mono-num">{formatWeight(totalJualKaret, 'kg')}</span>
                  </div>
                  <div className="border-t border-cyan-200 pt-1 flex justify-between font-semibold">
                    <span className="text-slate-600">Selisih Stok:</span>
                    <span className={`font-mono-num ${totalKaret - totalJualKaret >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                      {formatWeight(totalKaret - totalJualKaret, 'kg')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Total Volume Penjualan */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/70 space-y-2">
                <div className="flex items-center justify-between text-xs text-indigo-900 font-bold">
                  <span>TOTAL VOLUME PENJUALAN</span>
                  <span className="text-[10px] bg-indigo-200/80 px-1.5 py-0.5 rounded font-mono">Unit</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="text-2xl font-black text-indigo-950 font-mono-num pt-1">
                    {totalQtyJual.toLocaleString('id-ID')} <span className="text-xs font-semibold text-indigo-700">Unit</span>
                  </div>
                  <div className="text-[11px] text-indigo-700">
                    Total fisik item & komoditas keluar dari kasir toko
                  </div>
                  {(totalJualSawit > 0 || totalJualEmas > 0 || totalJualKaret > 0) && (
                    <div className="pt-1.5 border-t border-indigo-200/60 text-[10px] text-indigo-900 font-medium flex flex-wrap gap-x-2 gap-y-0.5">
                      {totalJualSawit > 0 && <span>Sawit: {formatWeight(totalJualSawit, 'kg')}</span>}
                      {totalJualEmas > 0 && <span>Emas: {formatWeight(totalJualEmas, 'gram')}</span>}
                      {totalJualKaret > 0 && <span>Karet: {formatWeight(totalJualKaret, 'kg')}</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabel Detail Rekapitulasi Harian */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  Rincian Rekapitulasi Per Tanggal
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Breakdown harian transaksi beli komoditas, omzet kasir, stok pembelian & penjualan, dan arus kas.
                </p>
              </div>
              <div className="text-xs font-semibold px-3 py-1 bg-slate-100 rounded-lg text-slate-600">
                {reportList.length} Baris Data
              </div>
            </div>

            {reportList.length === 0 ? (
              <EmptyState
                title="Tidak Ada Data Rekap"
                message="Tidak ditemukan transaksi pembelian maupun penjualan pada rentang tanggal yang dipilih."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                      <th className="py-3 px-3">No</th>
                      <th className="py-3 px-3">Tanggal</th>
                      <th className="py-3 px-3 text-right">Beli Komoditas (Rp)</th>
                      <th className="py-3 px-3 text-right">Penjualan Kasir (Rp)</th>
                      <th className="py-3 px-3 text-right">Emas (In / Out)</th>
                      <th className="py-3 px-3 text-right">Sawit (In / Out)</th>
                      <th className="py-3 px-3 text-right">Karet (In / Out)</th>
                      <th className="py-3 px-3 text-right">Vol. Penjualan (Qty)</th>
                      <th className="py-3 px-3 text-right">Arus Kas (Jual - Beli)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportList.map((item, idx) => {
                      const beliVal = parseFloat(item.beli) || 0;
                      const jualVal = parseFloat(item.jual) || 0;
                      const cashflow = jualVal - beliVal;
                      const emasVal = parseFloat(item.emas_gr) || 0;
                      const sawitVal = parseFloat(item.sawit_kg) || 0;
                      const karetVal = parseFloat(item.karet_kg) || 0;
                      const jualEmasVal = parseFloat(item.jual_emas_gr) || 0;
                      const jualSawitVal = parseFloat(item.jual_sawit_kg) || 0;
                      const jualKaretVal = parseFloat(item.jual_karet_kg) || 0;
                      const qtyJualVal = parseFloat(item.total_qty_jual) || 0;

                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 text-slate-400 font-mono-num">{idx + 1}</td>
                          <td className="py-3 px-3 font-semibold text-slate-900 whitespace-nowrap">
                            {formatDate(item.label)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono-num font-semibold text-amber-700">
                            {beliVal > 0 ? formatRupiah(beliVal) : '-'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono-num font-semibold text-emerald-700">
                            {jualVal > 0 ? formatRupiah(jualVal) : '-'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono-num text-xs">
                            <div className="text-amber-800 font-semibold">{emasVal > 0 ? `In: ${formatWeight(emasVal, 'gram')}` : '-'}</div>
                            <div className="text-emerald-700 text-[11px]">{jualEmasVal > 0 ? `Out: ${formatWeight(jualEmasVal, 'gram')}` : '-'}</div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono-num text-xs">
                            <div className="text-amber-800 font-semibold">{sawitVal > 0 ? `In: ${formatWeight(sawitVal, 'kg')}` : '-'}</div>
                            <div className="text-emerald-700 text-[11px]">{jualSawitVal > 0 ? `Out: ${formatWeight(jualSawitVal, 'kg')}` : '-'}</div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono-num text-xs">
                            <div className="text-amber-800 font-semibold">{karetVal > 0 ? `In: ${formatWeight(karetVal, 'kg')}` : '-'}</div>
                            <div className="text-emerald-700 text-[11px]">{jualKaretVal > 0 ? `Out: ${formatWeight(jualKaretVal, 'kg')}` : '-'}</div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono-num text-slate-700">
                            {qtyJualVal > 0 ? `${qtyJualVal.toLocaleString('id-ID')} unit` : '-'}
                          </td>
                          <td
                            className={`py-3 px-3 text-right font-mono-num font-bold whitespace-nowrap ${
                              cashflow >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {formatRupiah(cashflow)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-900">
                      <td colSpan={2} className="py-3 px-3 uppercase text-slate-600">
                        TOTAL KESELURUHAN
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num text-amber-700">
                        {formatRupiah(totalBeli)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num text-emerald-700">
                        {formatRupiah(totalJual)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num text-xs">
                        <div className="text-amber-800">In: {formatWeight(totalEmas, 'gram')}</div>
                        <div className="text-emerald-700">Out: {formatWeight(totalJualEmas, 'gram')}</div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num text-xs">
                        <div className="text-amber-800">In: {formatWeight(totalSawit, 'kg')}</div>
                        <div className="text-emerald-700">Out: {formatWeight(totalJualSawit, 'kg')}</div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num text-xs">
                        <div className="text-amber-800">In: {formatWeight(totalKaret, 'kg')}</div>
                        <div className="text-emerald-700">Out: {formatWeight(totalJualKaret, 'kg')}</div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num font-bold text-indigo-700">
                        {totalQtyJual.toLocaleString('id-ID')} unit
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-mono-num ${
                          selisihKas >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {formatRupiah(selisihKas)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
