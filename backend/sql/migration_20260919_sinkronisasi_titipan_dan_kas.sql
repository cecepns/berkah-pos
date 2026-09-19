-- ==============================================================================
-- FILE MIGRASI SQL: PEMBARUAN SISTEM TABUNGAN TITIPAN & SINKRONISASI KAS LACI
-- Project: Berkah POS
-- Tanggal: 19 September 2026
-- 
-- Pembaruan & Perbaikan:
-- 1. Penambahan nilai 'titipan' pada ENUM kolom `sumber` di tabel `kas`.
--    Hal ini memungkinkan transaksi Setor dan Tarik Tabungan Petani
--    otomatis tercatat di Buku Kas Toko (Kas di Laci).
-- 2. Sinkronisasi data historis transaksi titipan (setor & tarik) yang belum
--    tercatat di tabel `kas`.
-- ==============================================================================

USE `berkah_pos`;

-- ------------------------------------------------------------------------------
-- 1. MODIFIKASI KOLOM `sumber` PADA TABEL `kas`
-- ------------------------------------------------------------------------------
-- Menambahkan opsi 'titipan' ke dalam ENUM sumber transaksi kas
ALTER TABLE `kas` 
  MODIFY COLUMN `sumber` ENUM('manual', 'kasir', 'komoditas', 'bayar_hutang', 'titipan') DEFAULT 'manual';

-- ------------------------------------------------------------------------------
-- 2. SINKRONISASI DATA HISTORIS TITIPAN KE DALAM TABEL `kas`
-- ------------------------------------------------------------------------------
-- Memasukkan transaksi setor dan tarik tabungan lama yang belum ada di tabel kas
-- agar saldo kas di laci riil langsung sesuai.

INSERT INTO `kas` (`kode_transaksi`, `tipe`, `kategori`, `jumlah`, `sumber`, `referensi_id`, `keterangan`, `tanggal`)
SELECT 
  CONCAT(
    IF(t.jenis_transaksi = 'setor', 'KAS-IN', 'KAS-OUT'),
    '-SYNC-',
    DATE_FORMAT(t.tanggal, '%Y%m%d'),
    '-',
    t.id
  ) AS kode_transaksi,
  IF(t.jenis_transaksi = 'setor', 'masuk', 'keluar') AS tipe,
  IF(t.jenis_transaksi = 'setor', 'Setor Tabungan', 'Tarik Tabungan') AS kategori,
  t.jumlah,
  'titipan' AS sumber,
  t.kode_titipan AS referensi_id,
  IFNULL(
    CONCAT(IF(t.jenis_transaksi = 'setor', 'Setor Tabungan', 'Tarik Tabungan'), ' - ', p.nama, ': ', t.keterangan),
    CONCAT(IF(t.jenis_transaksi = 'setor', 'Setor tabungan simpanan', 'Penarikan tabungan tunai'), ' - ', p.nama, ' (', t.kode_titipan, ')')
  ) AS keterangan,
  t.tanggal
FROM `titipan` t
JOIN `pelanggan` p ON t.pelanggan_id = p.id
WHERE t.jenis_transaksi IN ('setor', 'tarik')
  AND NOT EXISTS (
    SELECT 1 FROM `kas` k 
    WHERE k.referensi_id = t.kode_titipan 
       OR k.keterangan LIKE CONCAT('%', t.kode_titipan, '%')
  );

-- ==============================================================================
-- SELESAI
-- Seluruh mutasi setor & tarik tabungan sekarang sinkron dengan uang kas toko.
-- ==============================================================================
