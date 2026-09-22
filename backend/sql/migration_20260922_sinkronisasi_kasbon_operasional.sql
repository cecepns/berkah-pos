-- ==============================================================================
-- FILE MIGRASI SQL: SINKRONISASI KASBON TUNAI & PENGELUARAN OPERASIONAL KAS LACI
-- Project: Berkah POS
-- Tanggal: 22 September 2026
-- 
-- Pembaruan & Perbaikan:
-- 1. Penambahan nilai 'hutang' pada ENUM kolom `sumber` di tabel `kas`.
--    Hal ini memungkinkan pencatatan kasbon tunai yang diambil pelanggan
--    otomatis memotong uang kas di laci kasir (KAS KELUAR).
-- 2. Sinkronisasi data historis transaksi kasbon tunai yang belum tercatat
--    sebagai kas keluar di tabel `kas`.
-- ==============================================================================

USE `berkah_pos`;

-- ------------------------------------------------------------------------------
-- 1. MODIFIKASI KOLOM `sumber` PADA TABEL `kas`
-- ------------------------------------------------------------------------------
-- Menambahkan opsi 'hutang' ke dalam ENUM sumber transaksi kas
ALTER TABLE `kas` 
  MODIFY COLUMN `sumber` ENUM('manual', 'kasir', 'komoditas', 'bayar_hutang', 'titipan', 'hutang') DEFAULT 'manual';

-- ------------------------------------------------------------------------------
-- 2. SINKRONISASI DATA HISTORIS KASBON TUNAI KE DALAM TABEL `kas`
-- ------------------------------------------------------------------------------
-- Memasukkan transaksi kasbon tunai lama yang belum tercatat sebagai kas keluar
-- agar saldo kas riil di laci kasir langsung sinkron dan akurat.

INSERT INTO `kas` (`kode_transaksi`, `tipe`, `kategori`, `jumlah`, `sumber`, `referensi_id`, `keterangan`, `tanggal`)
SELECT 
  CONCAT('KAS-OUT-SYNC-', DATE_FORMAT(h.tanggal, '%Y%m%d'), '-', h.id) AS kode_transaksi,
  'keluar' AS tipe,
  'Kasbon Tunai' AS kategori,
  h.jumlah_hutang AS jumlah,
  'hutang' AS sumber,
  h.kode_hutang AS referensi_id,
  IFNULL(
    CONCAT('Kasbon tunai - ', p.nama, ': ', h.keterangan),
    CONCAT('Kasbon tunai pelanggan - ', p.nama, ' (', h.kode_hutang, ')')
  ) AS keterangan,
  h.tanggal
FROM `hutang` h
JOIN `pelanggan` p ON h.pelanggan_id = p.id
WHERE h.tipe = 'kasbon_tunai'
  AND NOT EXISTS (
    SELECT 1 FROM `kas` k 
    WHERE k.referensi_id = h.kode_hutang 
       OR k.keterangan LIKE CONCAT('%', h.kode_hutang, '%')
  );

-- ==============================================================================
-- SELESAI
-- Seluruh mutasi kasbon tunai kini otomatis memotong uang kas di laci fisik toko.
-- ==============================================================================
