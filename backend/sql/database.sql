-- ==========================================================
-- Database Schema: Berkah POS (Kasir Komoditas & POS Umum)
-- Khusus Pembelian Emas (0.000 gram), Sawit & Karet (kg),
-- Kasir Penjualan, Hutang, Bayar Hutang, dan Tabungan/Titipan
-- ==========================================================

CREATE DATABASE IF NOT EXISTS `berkah_pos` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `berkah_pos`;

-- --------------------------------------------------------
-- 1. Tabel Pengaturan Toko & Komoditas
-- --------------------------------------------------------
DROP TABLE IF EXISTS `pengaturan`;
CREATE TABLE `pengaturan` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nama_toko` VARCHAR(100) NOT NULL DEFAULT 'Berkah POS & Komoditas',
  `tagline` VARCHAR(150) DEFAULT 'Solusi Transaksi Jual Beli Emas, Hasil Bumi & POS Kasir',
  `alamat` TEXT,
  `no_telepon` VARCHAR(30) DEFAULT '0822-8921-2770',
  `footer_struk` TEXT,
  `harga_emas_24k` DECIMAL(15, 2) DEFAULT 1350000.00,
  `harga_sawit_kg` DECIMAL(15, 2) DEFAULT 2650.00,
  `harga_karet_kg` DECIMAL(15, 2) DEFAULT 11500.00,
  `printer_tipe` ENUM('bluetooth', 'browser') DEFAULT 'bluetooth',
  `printer_lebar` ENUM('58mm', '80mm') DEFAULT '58mm',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `pengaturan` (`id`, `nama_toko`, `tagline`, `alamat`, `no_telepon`, `footer_struk`, `harga_emas_24k`, `harga_sawit_kg`, `harga_karet_kg`, `printer_tipe`, `printer_lebar`) VALUES
(1, 'Toko Berkah Utama', 'Jual Beli Emas, Sawit, Karet & Kasir Toko', 'Jl. Lintas Raya No. 45, Sentra Komoditas', '0822-8921-2770', 'Terima kasih telah bertransaksi di Toko Berkah Utama.\nBarang/komoditas yang sudah dibeli telah ditimbang bersama secara sah.', 1350000.00, 2650.00, 11500.00, 'bluetooth', '58mm');

-- --------------------------------------------------------
-- 2. Tabel Pelanggan & Petani (Pemasok / Pembeli)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `pelanggan`;
CREATE TABLE `pelanggan` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `kode` VARCHAR(20) NOT NULL UNIQUE,
  `nama` VARCHAR(100) NOT NULL,
  `no_hp` VARCHAR(30) DEFAULT NULL,
  `alamat` TEXT DEFAULT NULL,
  `kategori` ENUM('Petani Sawit', 'Petani Karet', 'Penjual Emas', 'Pelanggan Umum') DEFAULT 'Pelanggan Umum',
  `saldo_hutang` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `saldo_titipan` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `catatan` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_pelanggan_nama` (`nama`),
  INDEX `idx_pelanggan_nohp` (`no_hp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `pelanggan` (`id`, `kode`, `nama`, `no_hp`, `alamat`, `kategori`, `saldo_hutang`, `saldo_titipan`, `catatan`) VALUES
(1, 'PLG-001', 'Pak Haji Mansur', '0812-7788-9900', 'Desa Makmur Jaya RT 03 / RW 01', 'Petani Sawit', 1500000.00, 500000.00, 'Petani sawit langganan kebun 5 hektar'),
(2, 'PLG-002', 'Ibu Hj. Aminah', '0813-8822-4411', 'Pasar Sentral Blok B No. 12', 'Penjual Emas', 0.00, 2500000.00, 'Langganan jual beli perhiasan emas dan leburan'),
(3, 'PLG-003', 'Pak Sugeng Riyadi', '0852-6677-1122', 'Sp. Karet KM 18', 'Petani Karet', 750000.00, 0.00, 'Petani karet getah sheet & mangkok'),
(4, 'PLG-004', 'Siti Rahmawati', '0821-3344-5566', 'Jl. Melati No. 8', 'Pelanggan Umum', 0.00, 150000.00, 'Langganan sembako & perlengkapan tani');

-- --------------------------------------------------------
-- 3. Tabel Produk (Kasir Penjualan / Toko)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `produk`;
CREATE TABLE `produk` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `kode` VARCHAR(30) NOT NULL UNIQUE,
  `nama` VARCHAR(150) NOT NULL,
  `kategori` VARCHAR(50) DEFAULT 'Umum',
  `satuan` VARCHAR(20) DEFAULT 'pcs',
  `harga_beli` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `harga_jual` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `stok` DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
  `foto` VARCHAR(255) DEFAULT NULL,
  `deskripsi` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_produk_nama` (`nama`),
  INDEX `idx_produk_kode` (`kode`),
  INDEX `idx_produk_kategori` (`kategori`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `produk` (`id`, `kode`, `nama`, `kategori`, `satuan`, `harga_beli`, `harga_jual`, `stok`, `foto`, `deskripsi`) VALUES
(1, 'PRD-001', 'Cincin Emas Polos 24K (Model Klasik)', 'Perhiasan Emas', 'gram', 1350000.00, 1420000.00, 15.500, NULL, 'Cincin emas murni 24 karat kadar 99%'),
(2, 'PRD-002', 'Kalung Emas Rantai 18K (75%)', 'Perhiasan Emas', 'gram', 980000.00, 1075000.00, 24.250, NULL, 'Kalung emas 18 karat kadar 75% tahan lama'),
(3, 'PRD-003', 'Pupuk NPK Mutiara 16-16-16 (50 Kg)', 'Pertanian', 'sak', 780000.00, 850000.00, 45.000, NULL, 'Pupuk penyubur sawit dan karet'),
(4, 'PRD-004', 'Pisau Dodos Sawit Baja Super', 'Peralatan', 'pcs', 175000.00, 220000.00, 30.000, NULL, 'Dodos sawit tajam baja pegas asli'),
(5, 'PRD-005', 'Cuka Getah Pembeku Karet (Derigen 5L)', 'Pertanian', 'derigen', 65000.00, 80000.00, 60.000, NULL, 'Pembeku getah karet bersih tidak merusak kualitas'),
(6, 'KMD-EMAS', 'Emas Murni / Leburan', 'Perhiasan Emas', 'gram', 1350000.00, 1420000.00, 6.612, NULL, 'Produk otomatis komoditas emas murni/leburan. Stok otomatis bertambah saat timbang beli.'),
(7, 'KMD-SAWIT', 'Kelapa Sawit (TBS)', 'Pertanian', 'kg', 2650.00, 2800.00, 1406.500, NULL, 'Produk otomatis komoditas sawit TBS. Stok otomatis bertambah saat timbang beli.'),
(8, 'KMD-KARET', 'Karet Rakyat', 'Pertanian', 'kg', 11500.00, 12500.00, 361.000, NULL, 'Produk otomatis komoditas getah karet. Stok otomatis bertambah saat timbang beli.');

-- --------------------------------------------------------
-- 4. Tabel Transaksi Pembelian Komoditas (Emas, Sawit, Karet)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `transaksi_beli`;
CREATE TABLE `transaksi_beli` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `no_nota` VARCHAR(30) NOT NULL UNIQUE,
  `pelanggan_id` INT DEFAULT NULL,
  `nama_pelanggan` VARCHAR(100) NOT NULL,
  `jenis_komoditas` ENUM('emas', 'sawit', 'karet', 'lainnya') NOT NULL,
  `berat_kotor` DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
  `potongan_persen` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `potongan_nilai` DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
  `berat_bersih` DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
  `satuan` VARCHAR(20) NOT NULL DEFAULT 'kg',
  `kadar` VARCHAR(50) DEFAULT NULL,
  `harga_satuan` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `subtotal` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `biaya_lain` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `total_bayar` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `metode_bayar` ENUM('tunai', 'transfer', 'potong_hutang', 'masuk_titipan') NOT NULL DEFAULT 'tunai',
  `jumlah_potong_hutang` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `jumlah_masuk_titipan` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `catatan` TEXT DEFAULT NULL,
  `tanggal` DATE NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_trans_beli_tgl` (`tanggal`),
  INDEX `idx_trans_beli_komoditas` (`jenis_komoditas`),
  INDEX `idx_trans_beli_pelanggan` (`pelanggan_id`),
  FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `transaksi_beli` (`id`, `no_nota`, `pelanggan_id`, `nama_pelanggan`, `jenis_komoditas`, `berat_kotor`, `potongan_persen`, `potongan_nilai`, `berat_bersih`, `satuan`, `kadar`, `harga_satuan`, `subtotal`, `biaya_lain`, `total_bayar`, `metode_bayar`, `jumlah_potong_hutang`, `jumlah_masuk_titipan`, `catatan`, `tanggal`) VALUES
(1, 'NOT-B-20260915-001', 2, 'Ibu Hj. Aminah', 'emas', 2.350, 0.00, 0.050, 2.300, 'gram', '22K (70%)', 950000.00, 2185000.00, 0.00, 2185000.00, 'tunai', 0.00, 0.00, 'Beli cincin emas patah kadar 70%', '2026-09-15'),
(2, 'NOT-B-20260916-002', 1, 'Pak Haji Mansur', 'sawit', 1450.000, 3.00, 43.500, 1406.500, 'kg', 'TBS Matang', 2650.00, 3727225.00, 0.00, 3727225.00, 'potong_hutang', 1000000.00, 0.00, 'Panen rotasi kebun blok barat, potong kasbon 1 jt', '2026-09-16'),
(3, 'NOT-B-20260917-003', 3, 'Pak Sugeng Riyadi', 'karet', 380.000, 5.00, 19.000, 361.000, 'kg', 'Kadar 55% DRC', 11500.00, 4151500.00, 0.00, 4151500.00, 'tunai', 0.00, 0.00, 'Getah beku mangkok kualitas baik', '2026-09-17');

-- --------------------------------------------------------
-- 5. Tabel Transaksi Penjualan (POS Kasir Toko)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `transaksi_jual`;
CREATE TABLE `transaksi_jual` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `no_faktur` VARCHAR(30) NOT NULL UNIQUE,
  `pelanggan_id` INT DEFAULT NULL,
  `nama_pelanggan` VARCHAR(100) NOT NULL DEFAULT 'Pelanggan Umum',
  `subtotal` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `diskon` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `pajak` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `total_akhir` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `bayar` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `kembali` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `metode_bayar` ENUM('tunai', 'transfer', 'qris', 'hutang', 'saldo_titipan') NOT NULL DEFAULT 'tunai',
  `status_bayar` ENUM('lunas', 'belum_lunas') NOT NULL DEFAULT 'lunas',
  `kasir` VARCHAR(50) DEFAULT 'Admin',
  `catatan` TEXT DEFAULT NULL,
  `tanggal` DATE NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_trans_jual_tgl` (`tanggal`),
  INDEX `idx_trans_jual_pelanggan` (`pelanggan_id`),
  FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `transaksi_jual` (`id`, `no_faktur`, `pelanggan_id`, `nama_pelanggan`, `subtotal`, `diskon`, `pajak`, `total_akhir`, `bayar`, `kembali`, `metode_bayar`, `status_bayar`, `kasir`, `catatan`, `tanggal`) VALUES
(1, 'INV-20260916-001', 1, 'Pak Haji Mansur', 1700000.00, 0.00, 0.00, 1700000.00, 200000.00, 0.00, 'hutang', 'belum_lunas', 'Admin', 'Ambil pupuk NPK 2 sak kasbon dulu', '2026-09-16'),
(2, 'INV-20260917-002', 4, 'Siti Rahmawati', 300000.00, 0.00, 0.00, 300000.00, 300000.00, 0.00, 'tunai', 'lunas', 'Kasir 1', 'Beli dodos & cuka karet', '2026-09-17');

-- --------------------------------------------------------
-- 6. Tabel Detail Transaksi Penjualan
-- --------------------------------------------------------
DROP TABLE IF EXISTS `transaksi_jual_detail`;
CREATE TABLE `transaksi_jual_detail` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `transaksi_jual_id` INT NOT NULL,
  `produk_id` INT DEFAULT NULL,
  `kode_produk` VARCHAR(30) DEFAULT NULL,
  `nama_produk` VARCHAR(150) NOT NULL,
  `qty` DECIMAL(12, 3) NOT NULL DEFAULT 1.000,
  `satuan` VARCHAR(20) DEFAULT 'pcs',
  `harga_satuan` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `subtotal` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  FOREIGN KEY (`transaksi_jual_id`) REFERENCES `transaksi_jual`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`produk_id`) REFERENCES `produk`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `transaksi_jual_detail` (`id`, `transaksi_jual_id`, `produk_id`, `kode_produk`, `nama_produk`, `qty`, `satuan`, `harga_satuan`, `subtotal`) VALUES
(1, 1, 3, 'PRD-003', 'Pupuk NPK Mutiara 16-16-16 (50 Kg)', 2.000, 'sak', 850000.00, 1700000.00),
(2, 2, 4, 'PRD-004', 'Pisau Dodos Sawit Baja Super', 1.000, 'pcs', 220000.00, 220000.00),
(3, 2, 5, 'PRD-005', 'Cuka Getah Pembeku Karet (Derigen 5L)', 1.000, 'derigen', 80000.00, 80000.00);

-- --------------------------------------------------------
-- 7. Tabel Hutang / Kasbon Pelanggan
-- --------------------------------------------------------
DROP TABLE IF EXISTS `hutang`;
CREATE TABLE `hutang` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `kode_hutang` VARCHAR(30) NOT NULL UNIQUE,
  `pelanggan_id` INT NOT NULL,
  `transaksi_jual_id` INT DEFAULT NULL,
  `tipe` ENUM('kasbon_tunai', 'bon_belanja') NOT NULL DEFAULT 'bon_belanja',
  `jumlah_hutang` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `sisa_hutang` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `status` ENUM('belum_lunas', 'sebagian', 'lunas') NOT NULL DEFAULT 'belum_lunas',
  `jatuh_tempo` DATE DEFAULT NULL,
  `keterangan` TEXT DEFAULT NULL,
  `tanggal` DATE NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_hutang_pelanggan` (`pelanggan_id`),
  INDEX `idx_hutang_status` (`status`),
  FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`transaksi_jual_id`) REFERENCES `transaksi_jual`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `hutang` (`id`, `kode_hutang`, `pelanggan_id`, `transaksi_jual_id`, `tipe`, `jumlah_hutang`, `sisa_hutang`, `status`, `jatuh_tempo`, `keterangan`, `tanggal`) VALUES
(1, 'HTG-001', 1, 1, 'bon_belanja', 1500000.00, 1500000.00, 'belum_lunas', '2026-10-15', 'Kasbon Pupuk NPK 2 sak', '2026-09-16'),
(2, 'HTG-002', 3, NULL, 'kasbon_tunai', 750000.00, 750000.00, 'belum_lunas', '2026-09-30', 'Kasbon uang tunai untuk upah pekerja kebun', '2026-09-14');

-- --------------------------------------------------------
-- 8. Tabel Pembayaran Hutang
-- --------------------------------------------------------
DROP TABLE IF EXISTS `pembayaran_hutang`;
CREATE TABLE `pembayaran_hutang` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `kode_bayar` VARCHAR(30) NOT NULL UNIQUE,
  `hutang_id` INT NOT NULL,
  `pelanggan_id` INT NOT NULL,
  `jumlah_bayar` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `metode_bayar` ENUM('tunai', 'transfer', 'potong_hasil_komoditas', 'saldo_titipan') NOT NULL DEFAULT 'tunai',
  `sisa_sebelum` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `sisa_sesudah` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `catatan` TEXT DEFAULT NULL,
  `tanggal` DATE NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_bayar_hutang_pelanggan` (`pelanggan_id`),
  FOREIGN KEY (`hutang_id`) REFERENCES `hutang`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 9. Tabel Titip / Tabungan Pelanggan (Simpanan Petani/Nasabah)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `titipan`;
CREATE TABLE `titipan` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `kode_titipan` VARCHAR(30) NOT NULL UNIQUE,
  `pelanggan_id` INT NOT NULL,
  `jenis_transaksi` ENUM('setor', 'tarik', 'masuk_dari_jual_komoditas', 'potong_bayar_belanja', 'potong_bayar_hutang') NOT NULL,
  `jumlah` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `saldo_sebelum` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `saldo_sesudah` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `keterangan` TEXT DEFAULT NULL,
  `tanggal` DATE NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_titipan_pelanggan` (`pelanggan_id`),
  FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `titipan` (`id`, `kode_titipan`, `pelanggan_id`, `jenis_transaksi`, `jumlah`, `saldo_sebelum`, `saldo_sesudah`, `keterangan`, `tanggal`) VALUES
(1, 'TTP-001', 2, 'setor', 2500000.00, 0.00, 2500000.00, 'Titip uang simpanan modal tukar tambah emas', '2026-09-10'),
(2, 'TTP-002', 1, 'setor', 500000.00, 0.00, 500000.00, 'Tabungan hasil panen sawit', '2026-09-12'),
(3, 'TTP-003', 4, 'setor', 150000.00, 0.00, 150000.00, 'Titipan kembalian belanja untuk tabungan', '2026-09-14');

-- --------------------------------------------------------
-- 10. Tabel Pengguna / Users (Otentikasi & Akun Demo)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `nama` VARCHAR(100) NOT NULL,
  `role` ENUM('admin', 'kasir') NOT NULL DEFAULT 'admin',
  `status` ENUM('aktif', 'nonaktif') NOT NULL DEFAULT 'aktif',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `users` (`id`, `username`, `password`, `nama`, `role`, `status`) VALUES
(1, 'admin', 'admin123', 'Admin Berkah', 'admin', 'aktif'),
(2, 'kasir', 'kasir123', 'Kasir Utama', 'kasir', 'aktif');

-- --------------------------------------------------------
-- 11. Tabel Uang Kas Toko (Arus Kas Masuk & Keluar)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `kas`;
CREATE TABLE `kas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `kode_transaksi` VARCHAR(30) NOT NULL UNIQUE,
  `tipe` ENUM('masuk', 'keluar') NOT NULL,
  `kategori` VARCHAR(60) NOT NULL,
  `jumlah` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `sumber` ENUM('manual', 'kasir', 'komoditas', 'bayar_hutang', 'titipan', 'hutang') DEFAULT 'manual',
  `referensi_id` VARCHAR(50) DEFAULT NULL,
  `keterangan` TEXT DEFAULT NULL,
  `tanggal` DATE NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_kas_tipe` (`tipe`),
  INDEX `idx_kas_tgl` (`tanggal`),
  INDEX `idx_kas_kode` (`kode_transaksi`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `kas` (`id`, `kode_transaksi`, `tipe`, `kategori`, `jumlah`, `sumber`, `referensi_id`, `keterangan`, `tanggal`) VALUES
(1, 'KAS-IN-20260915-001', 'masuk', 'Modal Awal', 15000000.00, 'manual', NULL, 'Modal awal kasir & kas operasional toko', '2026-09-15'),
(2, 'KAS-OUT-20260915-002', 'keluar', 'Beli Perlengkapan', 350000.00, 'manual', NULL, 'Beli kertas nota thermal 10 roll & nota fisik', '2026-09-15'),
(3, 'KAS-OUT-20260916-003', 'keluar', 'Bensin & Angkutan', 120000.00, 'manual', NULL, 'Bensin motor operasional jemput getah karet', '2026-09-16'),
(4, 'KAS-OUT-20260917-004', 'keluar', 'Listrik & Air', 450000.00, 'manual', NULL, 'Bayar tagihan token listrik PLN toko', '2026-09-17'),
(5, 'KAS-IN-20260918-005', 'masuk', 'Tambah Modal', 5000000.00, 'manual', NULL, 'Setor modal tambahan untuk dana timbang beli sawit', '2026-09-18'),
(6, 'KAS-IN-20260918-006', 'masuk', 'Modal Belanja Komoditas', 100000000.00, 'manual', NULL, 'Dana kas disiapkan untuk belanja emas & komoditas hari ini', '2026-09-18');


