-- ==============================================================================
-- FILE MIGRASI SQL: PEMBARUAN SISTEM BERKAH POS
-- Project: Berkah POS
-- Tanggal: 18 September 2026
-- Fitur yang ditambahkan:
-- 1. Pembuatan Tabel `kas` (Uang Kas Toko / Buku Kas Operasional & Modal)
-- 2. Penyesuaian Presisi Desimal Stok (`stok` di `produk` & `qty` di `transaksi_jual_detail`)
--    agar mendukung pecahan komoditas seperti gram emas (misal: 6.612 gr)
-- 3. Inisialisasi Produk Komoditas Otomatis (Emas Leburan, Sawit TBS, Karet Rakyat)
-- 4. Inisialisasi Data Kas Awal Toko
-- ==============================================================================

USE `berkah_pos`;

-- ------------------------------------------------------------------------------
-- 1. TABEL UANG KAS TOKO (KAS MASUK & KELUAR)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `kas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `kode_transaksi` VARCHAR(30) NOT NULL UNIQUE,
  `tipe` ENUM('masuk', 'keluar') NOT NULL,
  `kategori` VARCHAR(60) NOT NULL,
  `jumlah` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `sumber` ENUM('manual', 'kasir', 'komoditas', 'bayar_hutang') DEFAULT 'manual',
  `referensi_id` VARCHAR(50) DEFAULT NULL,
  `keterangan` TEXT DEFAULT NULL,
  `tanggal` DATE NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_kas_tipe` (`tipe`),
  INDEX `idx_kas_tgl` (`tanggal`),
  INDEX `idx_kas_kode` (`kode_transaksi`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. PENYESUAIAN TIPE DATA DESIMAL UNTUK STOK & QTY (SUPPORT PECAHAN GRAM/KG)
-- ------------------------------------------------------------------------------
-- Memastikan kolom stok produk mendukung hingga 3 angka di belakang koma (misal: 6.612 gram)
ALTER TABLE `produk` 
  MODIFY COLUMN `stok` DECIMAL(12, 3) NOT NULL DEFAULT 0.000;

-- Memastikan kolom qty penjualan di kasir mendukung pecahan desimal (misal: jual 6.000 gram emas)
ALTER TABLE `transaksi_jual_detail` 
  MODIFY COLUMN `qty` DECIMAL(12, 3) NOT NULL DEFAULT 1.000;

-- ------------------------------------------------------------------------------
-- 3. PENAMBAHAN 3 PRODUK KOMODITAS TETAP (AUTO-STOK)
-- ------------------------------------------------------------------------------
-- Produk ini digunakan otomatis untuk menampung stok saat timbang beli emas/sawit/karet
-- dan dapat langsung dijual di Kasir.
INSERT INTO `produk` (`kode`, `nama`, `kategori`, `satuan`, `harga_beli`, `harga_jual`, `stok`, `foto`, `deskripsi`)
VALUES
('KMD-EMAS', 'Emas Murni / Leburan', 'Perhiasan Emas', 'gram', 1350000.00, 1420000.00, 6.612, NULL, 'Produk otomatis komoditas emas murni/leburan. Stok otomatis bertambah saat timbang beli.'),
('KMD-SAWIT', 'Kelapa Sawit (TBS)', 'Pertanian', 'kg', 2650.00, 2800.00, 1406.500, NULL, 'Produk otomatis komoditas sawit TBS. Stok otomatis bertambah saat timbang beli.'),
('KMD-KARET', 'Karet Rakyat', 'Pertanian', 'kg', 11500.00, 12500.00, 361.000, NULL, 'Produk otomatis komoditas getah karet. Stok otomatis bertambah saat timbang beli.')
ON DUPLICATE KEY UPDATE 
  `nama` = VALUES(`nama`),
  `kategori` = VALUES(`kategori`),
  `satuan` = VALUES(`satuan`),
  `deskripsi` = VALUES(`deskripsi`);

-- ------------------------------------------------------------------------------
-- 4. DATA SEED / SAMPLE AWAL UNTUK BUKU KAS TOKO
-- ------------------------------------------------------------------------------
INSERT IGNORE INTO `kas` (`kode_transaksi`, `tipe`, `kategori`, `jumlah`, `sumber`, `referensi_id`, `keterangan`, `tanggal`)
VALUES
('KAS-IN-20260915-001', 'masuk', 'Modal Awal', 15000000.00, 'manual', NULL, 'Modal awal kasir & kas operasional toko', '2026-09-15'),
('KAS-OUT-20260915-002', 'keluar', 'Beli Perlengkapan', 350000.00, 'manual', NULL, 'Beli kertas nota thermal 10 roll & nota fisik', '2026-09-15'),
('KAS-OUT-20260916-003', 'keluar', 'Bensin & Angkutan', 120000.00, 'manual', NULL, 'Bensin motor operasional jemput getah karet', '2026-09-16'),
('KAS-OUT-20260917-004', 'keluar', 'Listrik & Air', 450000.00, 'manual', NULL, 'Bayar tagihan token listrik PLN toko', '2026-09-17'),
('KAS-IN-20260918-005', 'masuk', 'Tambah Modal', 5000000.00, 'manual', NULL, 'Setor modal tambahan untuk dana timbang beli sawit', '2026-09-18'),
('KAS-IN-20260918-006', 'masuk', 'Modal Belanja Komoditas', 100000000.00, 'manual', NULL, 'Dana kas disiapkan untuk belanja emas & komoditas hari ini', '2026-09-18');

-- ------------------------------------------------------------------------------
-- 5. KOREKSI DATA LAMA JIKA TRANSAKSI NOT-B-20260918-012 TERCATAT 150.750
-- ------------------------------------------------------------------------------
UPDATE `transaksi_beli` 
SET `subtotal` = 2010000.00, `total_bayar` = 2010000.00 
WHERE `no_nota` = 'NOT-B-20260918-012' AND (`total_bayar` = 150750.00 OR `subtotal` = 1809000.00);

UPDATE `kas` 
SET `jumlah` = 2010000.00 
WHERE `referensi_id` = 'NOT-B-20260918-012' AND `jumlah` = 150750.00;

