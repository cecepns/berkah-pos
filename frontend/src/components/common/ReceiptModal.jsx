import React, { useRef } from 'react';
import { Printer, CheckCircle2 } from 'lucide-react';
import Modal from './Modal';
import { formatNumber, formatDate } from '@/utils/formatters';

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
    document.body.classList.add('printing-receipt');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-receipt');
    }, 1200);
  };

  const isKomoditas = type === 'komoditas';
  const isPos = type === 'pos';
  const isHutang = type === 'hutang';
  const isTitipan = type === 'titipan';

  const defaultStoreName = storeInfo?.nama_toko || '........................';

  // Format header title
  let headerTitle = 'NOTA PEMBELIAN';
  if (isPos) headerTitle = 'NOTA PENJUALAN';
  if (isHutang) headerTitle = 'BUKTI PEMBAYARAN KASBON';
  if (isTitipan) headerTitle = 'BUKTI MUTASI TABUNGAN';

  // Format No. Nota
  const noNota =
    data.no_nota ||
    data.no_faktur ||
    data.kode_bayar ||
    data.kode_titipan ||
    '1234.5';

  // Format Pelanggan
  const namaPelanggan =
    data.nama_pelanggan ||
    data.pelanggan_nama ||
    (isPos ? 'Pelanggan Umum' : 'Tuan');

  // Format Tanggal
  const tanggalStr = formatDate(data.tanggal || data.created_at || new Date().toISOString());

  // Format rows based on transaction type
  const renderItemRows = () => {
    if (isKomoditas) {
      const rows = [];
      const bruto = Number(data.berat_kotor || data.berat_bersih) || 0;
      const satuan = data.satuan === 'gram' || data.jenis_komoditas === 'emas' ? 'gr' : (data.satuan || 'kg');
      const decimals = satuan === 'gr' ? 3 : (bruto % 1 !== 0 ? 3 : 0);
      const formattedWeight = `${formatNumber(bruto, decimals)} ${satuan}`;
      const harga = Number(data.harga_satuan) || 0;
      const grossTotal = Number(data.gross_total) || Math.round(bruto * harga);

      // Row 1: Weight x Price
      rows.push({
        no: '1.',
        nama: formattedWeight,
        harga: formatNumber(harga, 0),
        jumlah: formatNumber(grossTotal, 0),
      });

      let currentTotal = grossTotal;
      let nextNo = 2;

      // Row 2: Potongan Persen
      const pct = Number(data.potongan_persen) || 0;
      if (pct > 0) {
        currentTotal = Number(data.after_potong) || Math.round(grossTotal * (1 - pct / 100));
        rows.push({
          no: `${nextNo}.`,
          nama: `Potong ${pct}%`,
          harga: '-',
          jumlah: formatNumber(currentTotal, 0),
        });
        nextNo += 1;
      } else if (Number(data.potongan_nilai) > 0) {
        currentTotal = Math.round((bruto - Number(data.potongan_nilai)) * harga);
        rows.push({
          no: `${nextNo}.`,
          nama: `Potong ${data.potongan_nilai} ${satuan}`,
          harga: '-',
          jumlah: formatNumber(currentTotal, 0),
        });
        nextNo += 1;
      }

      // Row 3: Dibagi 1 (e.g. Dibagi 2)
      let bagi1 = Number(data.pembagi_1) || 0;
      let bagi2 = Number(data.pembagi_2) || 0;

      // Fallback deteksi jika pembagi ada pada catatan
      if (!bagi1 && !bagi2 && data.catatan) {
        const matches = [...data.catatan.matchAll(/Dibagi\s+(\d+)/gi)];
        if (matches.length > 0) bagi1 = Number(matches[0][1]) || 0;
        if (matches.length > 1) bagi2 = Number(matches[1][1]) || 0;
      }

      if (bagi1 > 0) {
        currentTotal = Number(data.after_bagi_1) || Math.round(currentTotal / bagi1);
        rows.push({
          no: `${nextNo}.`,
          nama: `Dibagi ${bagi1}`,
          harga: '-',
          jumlah: formatNumber(currentTotal, 0),
        });
        nextNo += 1;
      }

      // Row 4: Dibagi 2 (e.g. Dibagi 6)
      if (bagi2 > 0) {
        currentTotal = Number(data.after_bagi_2) || Math.round(currentTotal / bagi2);
        rows.push({
          no: `${nextNo}.`,
          nama: `Dibagi ${bagi2}`,
          harga: '-',
          jumlah: formatNumber(currentTotal, 0),
        });
        nextNo += 1;
      }

      // Row: Biaya lain
      const biayaLain = Number(data.biaya_lain) || 0;
      if (biayaLain > 0) {
        currentTotal = Math.max(0, currentTotal - biayaLain);
        rows.push({
          no: `${nextNo}.`,
          nama: 'Biaya Lain',
          harga: '-',
          jumlah: `-${formatNumber(biayaLain, 0)}`,
        });
      }

      return rows;
    }

    if (isPos && Array.isArray(data.items)) {
      const rows = data.items.map((item, idx) => ({
        no: `${idx + 1}.`,
        nama: item.nama_produk,
        harga: formatNumber(item.harga_satuan, 0),
        jumlah: formatNumber(item.subtotal, 0),
      }));

      if (Number(data.diskon) > 0) {
        rows.push({
          no: '-',
          nama: 'Potongan Diskon',
          harga: '-',
          jumlah: `-${formatNumber(data.diskon, 0)}`,
        });
      }

      return rows;
    }

    if (isHutang) {
      return [
        {
          no: '1.',
          nama: 'Sisa Kasbon Sebelumnya',
          harga: '-',
          jumlah: formatNumber(data.sisa_sebelum || 0, 0),
        },
        {
          no: '2.',
          nama: 'Pembayaran Diterima',
          harga: '-',
          jumlah: formatNumber(data.jumlah_bayar || 0, 0),
        },
        {
          no: '3.',
          nama: 'Sisa Saldo Kasbon',
          harga: '-',
          jumlah: formatNumber(data.sisa_sesudah || 0, 0),
        },
      ];
    }

    if (isTitipan) {
      return [
        {
          no: '1.',
          nama: 'Saldo Awal',
          harga: '-',
          jumlah: formatNumber(data.saldo_sebelum || 0, 0),
        },
        {
          no: '2.',
          nama: `Mutasi (${data.jenis_transaksi?.replace(/_/g, ' ') || 'Titipan'})`,
          harga: '-',
          jumlah: formatNumber(data.jumlah || 0, 0),
        },
        {
          no: '3.',
          nama: 'Saldo Akhir',
          harga: '-',
          jumlah: formatNumber(data.saldo_sesudah || 0, 0),
        },
      ];
    }

    return [];
  };

  const rows = renderItemRows();

  // Cek apakah ada pembagian hasil mitra
  let checkBagi1 = Number(data.pembagi_1) || 0;
  let checkBagi2 = Number(data.pembagi_2) || 0;
  if (!checkBagi1 && !checkBagi2 && data.catatan) {
    const matches = [...data.catatan.matchAll(/Dibagi\s+(\d+)/gi)];
    if (matches.length > 0) checkBagi1 = Number(matches[0][1]) || 0;
    if (matches.length > 1) checkBagi2 = Number(matches[1][1]) || 0;
  }
  const hasPembagiMitra = checkBagi1 > 0 || checkBagi2 > 0;

  // Total akhir yang tercetak di bagian bawah nota
  // Jika ada pembagian mitra (pembagi 2/6), baris 'Jumlah Rp.' di nota menampilkan nominal bagi hasil (misal: 150.750)
  // sesuai gambar format klien
  const lastRowAmount = rows.length > 0
    ? Number(String(rows[rows.length - 1].jumlah).replace(/[^0-9.-]/g, ''))
    : 0;

  const finalTotal =
    hasPembagiMitra && (data.nilai_bagi_hasil !== undefined || data.after_bagi_2 !== undefined || lastRowAmount > 0)
      ? Number(data.nilai_bagi_hasil || data.after_bagi_2 || lastRowAmount)
      : data.total_bayar !== undefined
      ? Number(data.total_bayar)
      : data.total_akhir !== undefined
      ? Number(data.total_akhir)
      : data.jumlah_bayar !== undefined
      ? Number(data.jumlah_bayar)
      : Number(data.jumlah || 0);

  // Metode Bayar
  let metodeBayar = (data.metode_bayar || 'TUNAI').toUpperCase().replace(/_/g, ' ');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pratinjau Nota Transaksi"
      subtitle="Model nota struk thermal sesuai standar transaksi"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Top action bar */}
        <div className="no-print flex items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Nota Transaksi Siap Cetak</span>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Struk</span>
          </button>
        </div>

        {/* Receipt Paper Area */}
        <div className="p-4 bg-slate-200/60 rounded-2xl flex justify-center overflow-x-auto">
          <div
            id="thermal-receipt"
            ref={receiptRef}
            className="w-full max-w-[340px] bg-white text-black p-5 rounded-md shadow-md border border-slate-300 font-mono text-[12px] leading-snug tracking-tight"
          >
            {/* Header: Title */}
            <div className="text-center pb-3">
              <h2 className="text-lg sm:text-xl font-black tracking-wider uppercase text-black">
                {headerTitle}
              </h2>
            </div>

            {/* Metadata Info */}
            <div className="space-y-1 text-[11.5px] pb-2">
              <div className="flex">
                <span className="w-24 text-black">No. Nota</span>
                <span className="w-3 text-center">:</span>
                <span className="font-bold flex-1 text-black">{noNota}</span>
              </div>
              <div className="flex">
                <span className="w-24 text-black">Tanggal</span>
                <span className="w-3 text-center">:</span>
                <span className="flex-1 text-black">{tanggalStr}</span>
              </div>
              <div className="flex">
                <span className="w-24 text-black">Pelanggan</span>
                <span className="w-3 text-center">:</span>
                <span className="font-semibold flex-1 text-black">{namaPelanggan}</span>
              </div>
              <div className="flex">
                <span className="w-24 text-black">Toko</span>
                <span className="w-3 text-center">:</span>
                <span className="flex-1 text-black truncate">{defaultStoreName}</span>
              </div>
            </div>

            {/* Dashed Separator */}
            <div className="border-b border-dashed border-black my-2" />

            {/* Table Header */}
            <div className="flex text-[11px] font-bold py-1">
              <span className="w-6 text-left">No.</span>
              <span className="flex-1 text-left">Nama Barang</span>
              <span className="w-24 text-right">Harga</span>
              <span className="w-24 text-right">Jumlah</span>
            </div>

            {/* Dashed Separator */}
            <div className="border-b border-dashed border-black my-1" />

            {/* Table Rows */}
            <div className="space-y-1.5 py-1 text-[11px]">
              {rows.map((r, i) => (
                <div key={i} className="flex items-start">
                  <span className="w-6 text-left">{r.no}</span>
                  <span className="flex-1 text-left pr-1">{r.nama}</span>
                  <span className="w-24 text-right font-mono">{r.harga}</span>
                  <span className="w-24 text-right font-mono font-semibold">{r.jumlah}</span>
                </div>
              ))}
            </div>

            {/* Dashed Separator */}
            <div className="border-b border-dashed border-black my-2" />

            {/* Total Row */}
            <div className="flex justify-end items-baseline gap-2 py-1">
              <span className="text-xs font-bold">Jumlah Rp.</span>
              <span className="text-base sm:text-lg font-black font-mono">
                {formatNumber(finalTotal, 0)}
              </span>
            </div>

            {/* Dashed Separator */}
            <div className="border-b border-dashed border-black my-2" />

            {/* Payment Method */}
            <div className="py-1 text-[11.5px] font-semibold flex items-center justify-between">
              <span>Metode Bayar : {metodeBayar}</span>
              {isPos && data.metode_bayar === 'tunai' && Number(data.bayar) > 0 && (
                <span className="text-[10px] font-normal">
                  (Kembali: Rp. {formatNumber(data.kembali || 0, 0)})
                </span>
              )}
            </div>

            {/* Dashed Separator */}
            <div className="border-b border-dashed border-black my-2" />

            {/* Footer Thank You */}
            <div className="text-center pt-2 pb-3">
              <p className="text-[11.5px]">
                {isHutang
                  ? 'Terima kasih atas pembayaran Anda.'
                  : 'Terima kasih atas pembelian Anda.'}
              </p>
            </div>

            {/* Disclaimer Box */}
            <div className="border border-black p-2.5 text-center text-[10.5px] leading-tight space-y-0.5">
              <div className="font-bold">Perhatian :</div>
              <div>Barang yang sudah dibeli</div>
              <div>tidak dapat ditukar/dikembalikan</div>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="no-print flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </Modal>
  );
}
