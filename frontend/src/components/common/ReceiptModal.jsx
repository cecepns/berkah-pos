import React, { useRef } from 'react';
import { Printer, CheckCircle2 } from 'lucide-react';
import Modal from './Modal';
import { formatRupiah, formatWeight, formatDate } from '@/utils/formatters';

export default function ReceiptModal({
  isOpen,
  onClose,
  data,
  type = 'komoditas',
  storeInfo = {},
}) {
  const receiptRef = useRef(null);

  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  const isKomoditas = type === 'komoditas';
  const isPos = type === 'pos';
  const isHutang = type === 'hutang';
  const isTitipan = type === 'titipan';

  const defaultStore = {
    nama: storeInfo?.nama_toko || 'Toko Berkah Utama',
    tagline: storeInfo?.tagline || 'Jual Beli Emas, Sawit, Karet & Toko Kasir',
    alamat: storeInfo?.alamat || 'Jl. Lintas Sentra Komoditas No. 45',
    telepon: storeInfo?.no_telepon || '0822-8921-2770',
    footer: storeInfo?.footer_struk || 'Terima kasih atas kepercayaan Anda.\nBarang yang sudah ditimbang sah bersama.',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bukti Transaksi & Struk"
      subtitle="Pratinjau cetak printer thermal (58mm / 80mm)"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Actions bar above print paper */}
        <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Transaksi Berhasil</span>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Struk
          </button>
        </div>

        {/* Receipt Paper (Thermal style) */}
        <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 flex justify-center">
          <div
            id="thermal-receipt"
            ref={receiptRef}
            className="w-full max-w-[320px] bg-white text-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 font-mono-num text-[11px] leading-tight"
          >
            {/* Store Header */}
            <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-2">
              <div className="flex justify-center mb-1">
                <img src="/logo.png" alt="Logo" className="h-8 w-8 object-contain" />
              </div>
              <h4 className="font-extrabold text-sm uppercase tracking-wide text-black">
                {defaultStore.nama}
              </h4>
              <p className="text-[10px] text-slate-600 font-sans mt-0.5">{defaultStore.tagline}</p>
              <p className="text-[10px] text-slate-600 mt-0.5">{defaultStore.alamat}</p>
              <p className="text-[10px] text-slate-600">Telp: {defaultStore.telepon}</p>
            </div>

            {/* Meta Info */}
            <div className="border-b border-dashed border-slate-300 pb-2 mb-2 text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span className="text-slate-500">No. Nota:</span>
                <span className="font-bold text-black">{data.no_nota || data.no_faktur || data.kode_bayar || data.kode_titipan || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tanggal:</span>
                <span>{formatDate(data.tanggal || data.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pelanggan/Mitra:</span>
                <span className="font-semibold">{data.nama_pelanggan || data.pelanggan_nama || 'Umum'}</span>
              </div>
              {data.kasir && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Kasir/Petugas:</span>
                  <span>{data.kasir}</span>
                </div>
              )}
            </div>

            {/* Content for Commodity Purchase */}
            {isKomoditas && (
              <div className="border-b border-dashed border-slate-300 pb-2 mb-2 space-y-1">
                <div className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider mb-1">
                  -- NOTA TIMBANG & BELI KOMODITAS --
                </div>
                <div className="flex justify-between font-bold">
                  <span className="uppercase">{data.jenis_komoditas}</span>
                  {data.kadar && <span>({data.kadar})</span>}
                </div>
                <div className="flex justify-between text-slate-600 text-[10px]">
                  <span>Berat Kotor (Bruto):</span>
                  <span>{formatWeight(data.berat_kotor, data.satuan)}</span>
                </div>
                {(Number(data.potongan_persen) > 0 || Number(data.potongan_nilai) > 0) && (
                  <div className="flex justify-between text-slate-600 text-[10px]">
                    <span>Potongan / Tara:</span>
                    <span>
                      {Number(data.potongan_persen) > 0 ? `${data.potongan_persen}% ` : ''}
                      (-{formatWeight(data.potongan_nilai, data.satuan)})
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-800 border-t border-slate-200 pt-1">
                  <span>Berat Bersih (Netto):</span>
                  <span>{formatWeight(data.berat_bersih, data.satuan)}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[10px]">
                  <span>Harga per {data.satuan}:</span>
                  <span>{formatRupiah(data.harga_satuan)}</span>
                </div>
                <div className="flex justify-between text-slate-700 font-semibold">
                  <span>Subtotal:</span>
                  <span>{formatRupiah(data.subtotal)}</span>
                </div>
                {Number(data.biaya_lain) > 0 && (
                  <div className="flex justify-between text-slate-600 text-[10px]">
                    <span>Biaya / Potongan Lain:</span>
                    <span>-{formatRupiah(data.biaya_lain)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-black text-black border-t border-dashed border-slate-300 pt-1">
                  <span>TOTAL PEMBELIAN:</span>
                  <span>{formatRupiah(data.total_bayar)}</span>
                </div>

                {/* Settlement detail */}
                <div className="mt-2 pt-1 border-t border-slate-200 text-[10px] space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Metode Bayar:</span>
                    <span className="font-bold uppercase text-slate-800">{data.metode_bayar?.replace('_', ' ')}</span>
                  </div>
                  {Number(data.jumlah_potong_hutang) > 0 && (
                    <div className="flex justify-between text-amber-700">
                      <span>Dipotong Kasbon:</span>
                      <span>-{formatRupiah(data.jumlah_potong_hutang)}</span>
                    </div>
                  )}
                  {Number(data.jumlah_masuk_titipan) > 0 && (
                    <div className="flex justify-between text-blue-700">
                      <span>Dimasukkan Tabungan:</span>
                      <span>+{formatRupiah(data.jumlah_masuk_titipan)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Content for POS Sales */}
            {isPos && (
              <div className="border-b border-dashed border-slate-300 pb-2 mb-2">
                <div className="text-[10px] uppercase font-bold text-slate-700 tracking-wider mb-1">
                  -- STRUK PENJUALAN TOKO --
                </div>
                <table className="w-full text-[10px] mb-2">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="py-0.5 font-normal">Item</th>
                      <th className="py-0.5 text-right font-normal">Qty</th>
                      <th className="py-0.5 text-right font-normal">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.items?.map((item, idx) => (
                      <tr key={idx} className="align-top">
                        <td className="py-1">
                          <div className="font-semibold text-slate-800 leading-tight">
                            {item.nama_produk}
                          </div>
                          <div className="text-[9px] text-slate-500">
                            {formatRupiah(item.harga_satuan)}
                          </div>
                        </td>
                        <td className="py-1 text-right whitespace-nowrap">
                          {item.qty} {item.satuan}
                        </td>
                        <td className="py-1 text-right font-semibold whitespace-nowrap">
                          {formatRupiah(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="border-t border-slate-200 pt-1 space-y-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal:</span>
                    <span>{formatRupiah(data.subtotal)}</span>
                  </div>
                  {Number(data.diskon) > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Diskon:</span>
                      <span>-{formatRupiah(data.diskon)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs font-black text-black border-t border-dashed border-slate-300 pt-1">
                    <span>TOTAL AKHIR:</span>
                    <span>{formatRupiah(data.total_akhir)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Bayar ({data.metode_bayar?.toUpperCase()}):</span>
                    <span>{formatRupiah(data.bayar)}</span>
                  </div>
                  {data.metode_bayar === 'tunai' && (
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>Kembali:</span>
                      <span>{formatRupiah(data.kembali)}</span>
                    </div>
                  )}
                  {data.metode_bayar === 'hutang' && (
                    <div className="p-1 rounded bg-amber-50 text-amber-900 text-center font-bold text-[9px] mt-1">
                      DICATAT SEBAGAI BON / KASBON
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Content for Hutang Payment */}
            {isHutang && (
              <div className="border-b border-dashed border-slate-300 pb-2 mb-2 space-y-1">
                <div className="text-[10px] uppercase font-bold text-amber-700 tracking-wider mb-1">
                  -- BUKTI PEMBAYARAN KASBON --
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sisa Hutang Sebelum:</span>
                  <span>{formatRupiah(data.sisa_sebelum)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-600">
                  <span>Jumlah Dibayar:</span>
                  <span>{formatRupiah(data.jumlah_bayar)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Metode Pembayaran:</span>
                  <span className="uppercase">{data.metode_bayar}</span>
                </div>
                <div className="flex justify-between font-bold text-black border-t border-slate-200 pt-1">
                  <span>Sisa Hutang Sesudah:</span>
                  <span>{formatRupiah(data.sisa_sesudah)}</span>
                </div>
              </div>
            )}

            {/* Content for Titipan */}
            {isTitipan && (
              <div className="border-b border-dashed border-slate-300 pb-2 mb-2 space-y-1">
                <div className="text-[10px] uppercase font-bold text-blue-700 tracking-wider mb-1">
                  -- BUKTI MUTASI TABUNGAN / TITIPAN --
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Jenis Mutasi:</span>
                  <span className="font-bold uppercase text-blue-600">{data.jenis_transaksi}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Saldo Sebelum:</span>
                  <span>{formatRupiah(data.saldo_sebelum)}</span>
                </div>
                <div className="flex justify-between font-bold text-black">
                  <span>Jumlah:</span>
                  <span>{formatRupiah(data.jumlah)}</span>
                </div>
                <div className="flex justify-between font-bold text-blue-700 border-t border-slate-200 pt-1">
                  <span>Saldo Sesudah:</span>
                  <span>{formatRupiah(data.saldo_sesudah)}</span>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="text-center pt-2 text-[9px] text-slate-500 whitespace-pre-line font-sans">
              {defaultStore.footer}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
          >
            Tutup Pratinjau
          </button>
        </div>
      </div>
    </Modal>
  );
}
