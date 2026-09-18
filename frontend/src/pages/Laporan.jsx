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
  const selisihKas = totalJual - totalBeli;

  const hariAdaBeli = reportList.filter((r) => parseFloat(r.beli) > 0).length;
  const hariAdaJual = reportList.filter((r) => parseFloat(r.jual) > 0).length;

  return (
    <div id="report-printable" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-emerald-600" />
            Laporan & Rekap Transaksi
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Rekapitulasi pembelian komoditas hasil bumi, omzet kasir toko, dan mutasi volume komoditas.
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="no-print flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm border border-slate-200 shadow-2xs transition-all"
        >
          <Printer className="w-4 h-4 text-emerald-600" />
          <span>Cetak Dokumen Laporan</span>
        </button>
      </div>

      {/* Date Filter Bar */}
      <div className="no-print p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
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
            7 Hari Terakhir
          </button>
          <button
            type="button"
            onClick={() => setRangeQuick('bulan_ini')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition-colors whitespace-nowrap"
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

            {/* 4. Rekap Periode */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 uppercase font-bold">
                  Total Hari Rekap
                </span>
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono-num mb-1">
                {reportList.length} Hari
              </div>
              <div className="text-xs text-slate-400">
                Data aktif dalam rentang tanggal
              </div>
            </div>
          </div>

          {/* Volume Komoditas Diterima */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-500" />
              Total Volume Pembelian Komoditas Periode Terpilih
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60">
                <div className="text-xs text-amber-800 font-bold mb-1">EMAS MURNI / LEBURAN</div>
                <div className="text-2xl font-black text-slate-900 font-mono-num">
                  {formatWeight(totalEmas, 'gram')}
                </div>
                <div className="text-[11px] text-amber-700 mt-1">Presisi 3 desimal (0.000 gr)</div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/60">
                <div className="text-xs text-emerald-800 font-bold mb-1">KELAPA SAWIT (TBS)</div>
                <div className="text-2xl font-black text-slate-900 font-mono-num">
                  {formatWeight(totalSawit, 'kg')}
                </div>
                <div className="text-[11px] text-emerald-700 mt-1">
                  ± {(totalSawit / 1000).toFixed(2)} Ton
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-cyan-50/60 border border-cyan-200/60">
                <div className="text-xs text-cyan-800 font-bold mb-1">KARET RAKYAT</div>
                <div className="text-2xl font-black text-slate-900 font-mono-num">
                  {formatWeight(totalKaret, 'kg')}
                </div>
                <div className="text-[11px] text-cyan-700 mt-1">Netto setelah potongan DRC</div>
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
                  Breakdown harian transaksi beli komoditas, penjualan toko, volume barang, dan arus kas.
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
                      <th className="py-3 px-3 text-right">Emas (gr)</th>
                      <th className="py-3 px-3 text-right">Sawit (kg)</th>
                      <th className="py-3 px-3 text-right">Karet (kg)</th>
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
                          <td className="py-3 px-3 text-right font-mono-num text-slate-700">
                            {emasVal > 0 ? formatWeight(emasVal, 'gram') : '-'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono-num text-slate-700">
                            {sawitVal > 0 ? formatWeight(sawitVal, 'kg') : '-'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono-num text-slate-700">
                            {karetVal > 0 ? formatWeight(karetVal, 'kg') : '-'}
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
                      <td className="py-3 px-3 text-right font-mono-num">
                        {formatWeight(totalEmas, 'gram')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num">
                        {formatWeight(totalSawit, 'kg')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num">
                        {formatWeight(totalKaret, 'kg')}
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
