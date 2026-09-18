import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  TrendingUp,
  Scale,
  ShoppingCart,
  CreditCard,
  Wallet,
  ArrowUpRight,
  ChevronRight,
  Sparkles,
  Eye,
} from 'lucide-react';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import { formatRupiah, formatWeight } from '@/utils/formatters';
import { CardSkeleton } from '@/components/common/LoadingSkeleton';
import ReceiptModal from '@/components/common/ReceiptModal';

export default function Dashboard() {
  const { storeInfo } = useOutletContext();
  const [summary, setSummary] = useState(null);
  const [recentBeli, setRecentBeli] = useState([]);
  const [recentJual, setRecentJual] = useState([]);
  const [loading, setLoading] = useState(true);

  // Receipt Modal state
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [receiptType, setReceiptType] = useState('komoditas');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [resSummary, resBeli, resJual] = await Promise.all([
        request.get(API_ENDPOINTS.LAPORAN.RINGKASAN),
        request.get(API_ENDPOINTS.TRANSAKSI_BELI.LIST, { limit: 5 }),
        request.get(API_ENDPOINTS.TRANSAKSI_JUAL.LIST, { limit: 5 }),
      ]);

      if (resSummary?.success) setSummary(resSummary.data);
      if (resBeli?.success) setRecentBeli(resBeli.data || []);
      if (resJual?.success) setRecentJual(resJual.data || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-7 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-[11px] font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sistem Kasir & Komoditas Berkah</span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              Selamat Datang di {storeInfo?.nama_toko || 'Toko Berkah Utama'}
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm max-w-xl leading-relaxed">
              Pusat transaksi hasil bumi (Sawit & Karet), perhiasan emas presisi, kasir toko, serta buku kasbon dan tabungan mitra terpadu.
            </p>
          </div>

          {/* Quick Action Shortcuts */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-shrink-0">
            <Link
              to="/komoditas"
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition-all"
            >
              <Scale className="w-4 h-4" />
              <span>Timbang & Beli Komoditas</span>
            </Link>
            <Link
              to="/kasir"
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Buka Kasir POS</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main KPI Stats Grid - 2 Cols on mobile, 4 on desktop */}
      {loading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Pembelian Komoditas */}
          <div className="p-3.5 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">
                  Beli Komoditas
                </span>
                <div className="p-1.5 sm:p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex-shrink-0">
                  <Scale className="w-4 h-4" />
                </div>
              </div>
              <div className="text-base sm:text-xl md:text-2xl font-black text-slate-900 font-mono-num mb-1 truncate">
                {formatRupiah(summary?.total_pembelian || 0)}
              </div>
            </div>
            <div className="text-[10px] sm:text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
              <span className="truncate">Hari ini: {formatRupiah(summary?.hari_ini?.beli || 0)}</span>
              <Link to="/komoditas" className="text-amber-600 font-bold hover:underline inline-flex items-center flex-shrink-0 ml-1">
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Card 2: Penjualan Kasir POS */}
          <div className="p-3.5 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">
                  Penjualan Kasir
                </span>
                <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex-shrink-0">
                  <ShoppingCart className="w-4 h-4" />
                </div>
              </div>
              <div className="text-base sm:text-xl md:text-2xl font-black text-emerald-600 font-mono-num mb-1 truncate">
                {formatRupiah(summary?.total_penjualan || 0)}
              </div>
            </div>
            <div className="text-[10px] sm:text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
              <span className="truncate">Hari ini: {formatRupiah(summary?.hari_ini?.jual || 0)}</span>
              <Link to="/kasir" className="text-emerald-600 font-bold hover:underline inline-flex items-center flex-shrink-0 ml-1">
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Card 3: Piutang / Kasbon Pelanggan */}
          <div className="p-3.5 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">
                  Total Kasbon
                </span>
                <div className="p-1.5 sm:p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex-shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className="text-base sm:text-xl md:text-2xl font-black text-rose-600 font-mono-num mb-1 truncate">
                {formatRupiah(summary?.total_hutang || 0)}
              </div>
            </div>
            <div className="text-[10px] sm:text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
              <span className="truncate">Belum lunas</span>
              <Link to="/hutang" className="text-rose-600 font-bold hover:underline inline-flex items-center flex-shrink-0 ml-1">
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Card 4: Tabungan / Titipan Nasabah */}
          <div className="p-3.5 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">
                  Saldo Titipan
                </span>
                <div className="p-1.5 sm:p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex-shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="text-base sm:text-xl md:text-2xl font-black text-blue-600 font-mono-num mb-1 truncate">
                {formatRupiah(summary?.total_titipan || 0)}
              </div>
            </div>
            <div className="text-[10px] sm:text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
              <span className="truncate">Tabungan mitra</span>
              <Link to="/titipan" className="text-blue-600 font-bold hover:underline inline-flex items-center flex-shrink-0 ml-1">
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Commodity Volume Cards & Market Pricing */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Left 2 Cols: Komoditas Breakdown */}
        <div className="lg:col-span-2 p-4 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                Rekap Volume Komoditas
              </h3>
              <p className="text-xs text-slate-500">Total berat komoditas yang berhasil dihimpun</p>
            </div>
            <Link
              to="/komoditas"
              className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1"
            >
              Beli Sekarang <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Emas */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/70">
              <div className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-0.5">
                Emas Diterima
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono-num">
                {formatWeight(summary?.komoditas?.emas_gram || 0, 'gram')}
              </div>
              <p className="text-[11px] text-amber-700 mt-1">Presisi 3 desimal (0.000 gr)</p>
            </div>

            {/* Sawit */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/70">
              <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-0.5">
                Kelapa Sawit (TBS)
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono-num">
                {formatWeight(summary?.komoditas?.sawit_kg || 0, 'kg')}
              </div>
              <p className="text-[11px] text-emerald-700 mt-1">
                ± {((summary?.komoditas?.sawit_kg || 0) / 1000).toFixed(2)} Ton Netto
              </p>
            </div>

            {/* Karet */}
            <div className="p-3.5 rounded-2xl bg-cyan-50/70 border border-cyan-200/70">
              <div className="text-xs font-bold text-cyan-800 uppercase tracking-wider mb-0.5">
                Karet (Bokar/DRC)
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono-num">
                {formatWeight(summary?.komoditas?.karet_kg || 0, 'kg')}
              </div>
              <p className="text-[11px] text-cyan-700 mt-1">Potongan kadar terverifikasi</p>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Harga Pasar Hari Ini & Quick Update */}
        <div className="p-4 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Harga Patokan Pasar
            </h3>
            <Link
              to="/pengaturan"
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              Ubah
            </Link>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <div>
                <div className="text-xs font-bold text-slate-800">Emas Murni 24K</div>
                <div className="text-[10px] text-slate-400">Patokan perhiasan & leburan</div>
              </div>
              <div className="text-right">
                <div className="text-xs sm:text-sm font-bold text-amber-600 font-mono-num">
                  {formatRupiah(storeInfo?.harga_emas_24k || 1350000)}
                </div>
                <div className="text-[9px] text-slate-400">per gram</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <div>
                <div className="text-xs font-bold text-slate-800">Kelapa Sawit (TBS)</div>
                <div className="text-[10px] text-slate-400">Harga timbang pabrik</div>
              </div>
              <div className="text-right">
                <div className="text-xs sm:text-sm font-bold text-emerald-600 font-mono-num">
                  {formatRupiah(storeInfo?.harga_sawit_kg || 2650)}
                </div>
                <div className="text-[9px] text-slate-400">per kg</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <div>
                <div className="text-xs font-bold text-slate-800">Karet Rakyat (Bokar)</div>
                <div className="text-[10px] text-slate-400">Kadar beku mangkok / sheet</div>
              </div>
              <div className="text-right">
                <div className="text-xs sm:text-sm font-bold text-cyan-600 font-mono-num">
                  {formatRupiah(storeInfo?.harga_karet_kg || 11500)}
                </div>
                <div className="text-[9px] text-slate-400">per kg</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity: 2 Tables Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Recent Commodity Purchases */}
        <div className="p-4 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-500" />
              Pembelian Komoditas Terbaru
            </h3>
            <Link to="/komoditas" className="text-xs text-amber-600 font-semibold hover:underline">
              Semua
            </Link>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-xs min-w-[440px]">
              <thead className="text-slate-500 bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Nota</th>
                  <th className="py-2.5 px-3 font-semibold">Mitra</th>
                  <th className="py-2.5 px-3 font-semibold">Komoditas</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Total</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentBeli.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      Belum ada transaksi pembelian
                    </td>
                  </tr>
                ) : (
                  recentBeli.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono-num font-semibold text-slate-700">
                        {item.no_nota}
                      </td>
                      <td className="py-2.5 px-3 text-slate-900 font-medium">
                        {item.nama_pelanggan}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="capitalize px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                          {item.jenis_komoditas} ({formatWeight(item.berat_bersih, item.satuan)})
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num font-bold text-amber-600">
                        {formatRupiah(item.total_bayar)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReceipt(item);
                            setReceiptType('komoditas');
                          }}
                          className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                          title="Lihat & Cetak Struk"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent POS Sales */}
        <div className="p-4 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-emerald-600" />
              Penjualan Kasir POS Terbaru
            </h3>
            <Link to="/kasir" className="text-xs text-emerald-600 font-semibold hover:underline">
              Kasir
            </Link>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-xs min-w-[440px]">
              <thead className="text-slate-500 bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Faktur</th>
                  <th className="py-2.5 px-3 font-semibold">Pelanggan</th>
                  <th className="py-2.5 px-3 font-semibold">Metode</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Total</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentJual.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      Belum ada penjualan kasir
                    </td>
                  </tr>
                ) : (
                  recentJual.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono-num font-semibold text-slate-700">
                        {item.no_faktur}
                      </td>
                      <td className="py-2.5 px-3 text-slate-900 font-medium">
                        {item.nama_pelanggan || 'Umum'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                          {item.metode_bayar}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num font-bold text-emerald-600">
                        {formatRupiah(item.total_akhir)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReceipt(item);
                            setReceiptType('pos');
                          }}
                          className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                          title="Lihat & Cetak Struk"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      <ReceiptModal
        isOpen={Boolean(selectedReceipt)}
        onClose={() => setSelectedReceipt(null)}
        data={selectedReceipt}
        type={receiptType}
        storeInfo={storeInfo}
      />
    </div>
  );
}
