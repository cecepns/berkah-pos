/**
 * ====================================================================
 * Berkah POS - Backend Server (Pure Express.js + MySQL REST API)
 * Sesuai Aturan AGENTS.md & Instruksi User:
 * - 1 File Utama Server (server.js)
 * - Murni koneksi MySQL (TANPA MOCK DATA)
 * - Prepared Statements (Anti SQL Injection)
 * - Transaksi ACID untuk jual, beli komoditas, potong hutang & tabungan
 * ====================================================================
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Upload directory config
const uploadDir = path.join(__dirname, 'uploads-berkah-pos');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'foto-' + uniqueSuffix + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('Hanya file gambar (jpg, png, webp) yang diperbolehkan!'));
  },
});

// MySQL Pool Connection (PURE DATABASE)
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'berkah_pos',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test MySQL connection on startup & ensure users table
async function testDbConnection() {
  try {
    const conn = await db.getConnection();
    await conn.ping();

    // Auto-create users table if not exists
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`username\` VARCHAR(50) NOT NULL UNIQUE,
        \`password\` VARCHAR(255) NOT NULL,
        \`nama\` VARCHAR(100) NOT NULL,
        \`role\` ENUM('admin', 'kasir') NOT NULL DEFAULT 'admin',
        \`status\` ENUM('aktif', 'nonaktif') NOT NULL DEFAULT 'aktif',
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_users_username\` (\`username\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Seed admin & kasir if not present
    const [adminRows] = await conn.query("SELECT id FROM users WHERE username = 'admin'");
    if (adminRows.length === 0) {
      await conn.query(
        "INSERT INTO users (username, password, nama, role, status) VALUES ('admin', 'admin123', 'Admin Berkah', 'admin', 'aktif')"
      );
      console.log('👤 Akun Demo Admin dibuat (admin / admin123)');
    }

    const [kasirRows] = await conn.query("SELECT id FROM users WHERE username = 'kasir'");
    if (kasirRows.length === 0) {
      await conn.query(
        "INSERT INTO users (username, password, nama, role, status) VALUES ('kasir', 'kasir123', 'Kasir Utama', 'kasir', 'aktif')"
      );
      console.log('👤 Akun Demo Kasir dibuat (kasir / kasir123)');
    }

    conn.release();
    console.log('✅ Berhasil terhubung ke database MySQL berkah_pos & tabel users siap');
  } catch (err) {
    console.error('❌ Gagal terhubung ke MySQL:', err.message);
    console.error('Pastikan MySQL service aktif dan database berkah_pos telah diimport dari sql/database.sql');
  }
}
testDbConnection();

// ====================================================================
// 0. ENDPOINTS: AUTHENTICATION (LOGIN, PROFILE, DEMO ACCOUNTS)
// ====================================================================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username dan password wajib diisi!',
      });
    }

    const [rows] = await db.query(
      'SELECT id, username, password, nama, role, status FROM users WHERE username = ?',
      [username.trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Username tidak ditemukan!',
      });
    }

    const user = rows[0];

    if (user.status !== 'aktif') {
      return res.status(403).json({
        success: false,
        message: 'Akun Anda sedang dinonaktifkan. Hubungi administrator.',
      });
    }

    // Password validation (plain or hash support)
    const isValid = user.password === password || user.password === Buffer.from(password).toString('base64');
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Password yang Anda masukkan salah!',
      });
    }

    // Generate session token (lightweight bearer token encoding user payload + timestamp)
    const tokenPayload = {
      id: user.id,
      username: user.username,
      nama: user.nama,
      role: user.role,
      issuedAt: Date.now(),
    };
    const token = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');

    return res.json({
      success: true,
      message: 'Login berhasil! Selamat datang, ' + user.nama,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          nama: user.nama,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('POST /api/auth/login error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/auth/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized - Token tidak ditemukan' });
    }

    const token = authHeader.split(' ')[1];
    let payload;
    try {
      payload = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Token tidak valid' });
    }

    const [rows] = await db.query(
      'SELECT id, username, nama, role, status FROM users WHERE id = ?',
      [payload.id]
    );

    if (rows.length === 0 || rows[0].status !== 'aktif') {
      return res.status(401).json({ success: false, message: 'User tidak ditemukan atau tidak aktif' });
    }

    return res.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error('GET /api/auth/profile error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/auth/demo-accounts', (req, res) => {
  return res.json({
    success: true,
    data: [
      {
        role: 'admin',
        nama: 'Admin Berkah',
        username: 'admin',
        password: 'admin123',
        keterangan: 'Akses penuh ke seluruh sistem, laporan, dan pengaturan toko',
      },
      {
        role: 'kasir',
        nama: 'Kasir Utama',
        username: 'kasir',
        password: 'kasir123',
        keterangan: 'Akses transaksi kasir POS, pembelian komoditas, dan data pelanggan',
      },
    ],
  });
});


// ====================================================================
// 1. ENDPOINTS: PENGATURAN TOKO & HARGA KOMODITAS
// ====================================================================
app.get('/api/pengaturan', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM pengaturan LIMIT 1');
    if (rows.length === 0) {
      // Inisialisasi pengaturan default jika kosong
      await db.query(`INSERT INTO pengaturan (id, nama_toko, tagline, alamat, no_telepon, footer_struk, harga_emas_24k, harga_sawit_kg, harga_karet_kg, printer_tipe, printer_lebar) 
        VALUES (1, 'Toko Berkah Utama', 'Jual Beli Emas, Sawit, Karet & Kasir Toko', 'Jl. Lintas Raya No. 45', '0822-8921-2770', 'Terima kasih atas kunjungan Anda', 1350000.00, 2650.00, 11500.00, 'bluetooth', '58mm')`);
      const [newRows] = await db.query('SELECT * FROM pengaturan LIMIT 1');
      return res.json({ success: true, data: newRows[0] });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('GET /api/pengaturan error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/pengaturan', async (req, res) => {
  try {
    const {
      nama_toko,
      tagline,
      alamat,
      no_telepon,
      footer_struk,
      harga_emas_24k,
      harga_sawit_kg,
      harga_karet_kg,
      printer_tipe,
      printer_lebar,
    } = req.body;

    await db.query(
      `UPDATE pengaturan SET 
        nama_toko = COALESCE(?, nama_toko),
        tagline = COALESCE(?, tagline),
        alamat = COALESCE(?, alamat),
        no_telepon = COALESCE(?, no_telepon),
        footer_struk = COALESCE(?, footer_struk),
        harga_emas_24k = COALESCE(?, harga_emas_24k),
        harga_sawit_kg = COALESCE(?, harga_sawit_kg),
        harga_karet_kg = COALESCE(?, harga_karet_kg),
        printer_tipe = COALESCE(?, printer_tipe),
        printer_lebar = COALESCE(?, printer_lebar)
      WHERE id = 1`,
      [
        nama_toko,
        tagline,
        alamat,
        no_telepon,
        footer_struk,
        harga_emas_24k,
        harga_sawit_kg,
        harga_karet_kg,
        printer_tipe,
        printer_lebar,
      ]
    );

    const [rows] = await db.query('SELECT * FROM pengaturan WHERE id = 1');
    return res.json({
      success: true,
      message: 'Pengaturan toko berhasil diperbarui',
      data: rows[0],
    });
  } catch (error) {
    console.error('PUT /api/pengaturan error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ====================================================================
// 2. ENDPOINTS: PELANGGAN (PETANI / PEMASOK / PEMBELI)
// ====================================================================
app.get('/api/pelanggan', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : '';
    const kategori = req.query.kategori ? req.query.kategori.trim() : '';

    let whereClause = ' WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (nama LIKE ? OR kode LIKE ? OR no_hp LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    if (kategori) {
      whereClause += ' AND kategori = ?';
      params.push(kategori);
    }

    // Hitung total data
    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM pelanggan ${whereClause}`,
      params
    );
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit) || 1;

    // Ambil data pelanggan
    const [rows] = await db.query(
      `SELECT * FROM pelanggan ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('GET /api/pelanggan error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/pelanggan/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await db.query('SELECT * FROM pelanggan WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pelanggan tidak ditemukan' });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('GET /api/pelanggan/:id error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/pelanggan', async (req, res) => {
  try {
    const { nama, no_hp, alamat, kategori = 'Pelanggan Umum', catatan } = req.body;
    if (!nama || !nama.trim()) {
      return res.status(400).json({ success: false, message: 'Nama pelanggan wajib diisi' });
    }

    // Generate kode pelanggan unik otomatis
    const [maxResult] = await db.query('SELECT MAX(id) as maxId FROM pelanggan');
    const nextId = (maxResult[0].maxId || 0) + 1;
    const kode = `PLG-${String(nextId).padStart(3, '0')}`;

    const [result] = await db.query(
      `INSERT INTO pelanggan (kode, nama, no_hp, alamat, kategori, saldo_hutang, saldo_titipan, catatan) 
       VALUES (?, ?, ?, ?, ?, 0.00, 0.00, ?)`,
      [kode, nama.trim(), no_hp || null, alamat || null, kategori, catatan || null]
    );

    const [newRecord] = await db.query('SELECT * FROM pelanggan WHERE id = ?', [result.insertId]);
    return res.status(201).json({
      success: true,
      message: 'Pelanggan berhasil ditambahkan',
      data: newRecord[0],
    });
  } catch (error) {
    console.error('POST /api/pelanggan error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/pelanggan/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { nama, no_hp, alamat, kategori, catatan } = req.body;

    if (!nama || !nama.trim()) {
      return res.status(400).json({ success: false, message: 'Nama pelanggan wajib diisi' });
    }

    await db.query(
      `UPDATE pelanggan SET 
        nama = ?, 
        no_hp = ?, 
        alamat = ?, 
        kategori = ?, 
        catatan = ? 
       WHERE id = ?`,
      [nama.trim(), no_hp || null, alamat || null, kategori || 'Pelanggan Umum', catatan || null, id]
    );

    const [rows] = await db.query('SELECT * FROM pelanggan WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pelanggan tidak ditemukan' });
    }

    return res.json({
      success: true,
      message: 'Pelanggan berhasil diperbarui',
      data: rows[0],
    });
  } catch (error) {
    console.error('PUT /api/pelanggan/:id error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/pelanggan/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.query('DELETE FROM pelanggan WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Pelanggan berhasil dihapus' });
  } catch (error) {
    console.error('DELETE /api/pelanggan/:id error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ====================================================================
// 3. ENDPOINTS: PRODUK (KASIR PENJUALAN TOKO)
// ====================================================================
app.get('/api/produk', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : '';
    const kategori = req.query.kategori ? req.query.kategori.trim() : '';

    let whereClause = ' WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (nama LIKE ? OR kode LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term);
    }
    if (kategori) {
      whereClause += ' AND kategori = ?';
      params.push(kategori);
    }

    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM produk ${whereClause}`,
      params
    );
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit) || 1;

    const [rows] = await db.query(
      `SELECT * FROM produk ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('GET /api/produk error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/produk', upload.single('foto'), async (req, res) => {
  try {
    const { nama, kategori = 'Umum', satuan = 'pcs', harga_beli = 0, harga_jual = 0, stok = 0, deskripsi } = req.body;
    if (!nama || !nama.trim()) {
      return res.status(400).json({ success: false, message: 'Nama produk wajib diisi' });
    }

    let kode = req.body.kode ? req.body.kode.trim() : null;
    if (!kode) {
      const [maxResult] = await db.query('SELECT MAX(id) as maxId FROM produk');
      const nextId = (maxResult[0].maxId || 0) + 1;
      kode = `PRD-${String(nextId).padStart(3, '0')}`;
    }

    const foto = req.file ? `/uploads/${req.file.filename}` : null;

    const [result] = await db.query(
      `INSERT INTO produk (kode, nama, kategori, satuan, harga_beli, harga_jual, stok, foto, deskripsi) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [kode, nama.trim(), kategori, satuan, parseFloat(harga_beli) || 0, parseFloat(harga_jual) || 0, parseFloat(stok) || 0, foto, deskripsi || null]
    );

    const [newRecord] = await db.query('SELECT * FROM produk WHERE id = ?', [result.insertId]);
    return res.status(201).json({
      success: true,
      message: 'Produk berhasil ditambahkan',
      data: newRecord[0],
    });
  } catch (error) {
    console.error('POST /api/produk error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/produk/:id', upload.single('foto'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { nama, kategori, satuan, harga_beli, harga_jual, stok, deskripsi } = req.body;

    if (!nama || !nama.trim()) {
      return res.status(400).json({ success: false, message: 'Nama produk wajib diisi' });
    }

    let fotoUpdateQuery = '';
    const updateParams = [nama.trim(), kategori || 'Umum', satuan || 'pcs', parseFloat(harga_beli) || 0, parseFloat(harga_jual) || 0, parseFloat(stok) || 0, deskripsi || null];

    if (req.file) {
      fotoUpdateQuery = ', foto = ?';
      updateParams.push(`/uploads/${req.file.filename}`);
    }
    updateParams.push(id);

    await db.query(
      `UPDATE produk SET 
        nama = ?, 
        kategori = ?, 
        satuan = ?, 
        harga_beli = ?, 
        harga_jual = ?, 
        stok = ?, 
        deskripsi = ?
        ${fotoUpdateQuery}
       WHERE id = ?`,
      updateParams
    );

    const [rows] = await db.query('SELECT * FROM produk WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
    }

    return res.json({
      success: true,
      message: 'Produk berhasil diperbarui',
      data: rows[0],
    });
  } catch (error) {
    console.error('PUT /api/produk/:id error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/produk/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.query('DELETE FROM produk WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Produk berhasil dihapus' });
  } catch (error) {
    console.error('DELETE /api/produk/:id error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ====================================================================
// 4. ENDPOINTS: TRANSAKSI BELI KOMODITAS (EMAS 0.000 gr, SAWIT, KARET)
// ====================================================================
app.get('/api/transaksi-beli', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : '';
    const komoditas = req.query.komoditas ? req.query.komoditas.trim() : '';
    const tanggal_awal = req.query.tanggal_awal ? req.query.tanggal_awal.trim() : '';
    const tanggal_akhir = req.query.tanggal_akhir ? req.query.tanggal_akhir.trim() : '';

    let whereClause = ' WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (no_nota LIKE ? OR nama_pelanggan LIKE ? OR kadar LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    if (komoditas) {
      whereClause += ' AND jenis_komoditas = ?';
      params.push(komoditas);
    }
    if (tanggal_awal) {
      whereClause += ' AND tanggal >= ?';
      params.push(tanggal_awal);
    }
    if (tanggal_akhir) {
      whereClause += ' AND tanggal <= ?';
      params.push(tanggal_akhir);
    }

    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM transaksi_beli ${whereClause}`,
      params
    );
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit) || 1;

    const [rows] = await db.query(
      `SELECT * FROM transaksi_beli ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('GET /api/transaksi-beli error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/transaksi-beli', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      pelanggan_id,
      nama_pelanggan,
      jenis_komoditas, // 'emas' | 'sawit' | 'karet' | 'lainnya'
      berat_kotor, // decimal (0.000 for gold, or kg)
      potongan_persen = 0,
      potongan_nilai = 0,
      satuan = 'gram',
      kadar = '',
      harga_satuan,
      biaya_lain = 0,
      metode_bayar = 'tunai', // 'tunai' | 'transfer' | 'potong_hutang' | 'masuk_titipan'
      jumlah_potong_hutang = 0,
      jumlah_masuk_titipan = 0,
      catatan = '',
      tanggal = new Date().toISOString().slice(0, 10),
    } = req.body;

    if (!jenis_komoditas || !berat_kotor || !harga_satuan) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Komoditas, berat kotor, dan harga satuan wajib diisi!',
      });
    }

    const grossWeight = parseFloat(berat_kotor);
    let netWeight = grossWeight;
    const cutVal = parseFloat(potongan_nilai) || 0;
    const cutPct = parseFloat(potongan_persen) || 0;

    if (cutVal > 0) {
      netWeight = Math.max(0, grossWeight - cutVal);
    } else if (cutPct > 0) {
      netWeight = Math.max(0, grossWeight - (grossWeight * cutPct) / 100);
    }

    // Presisi 3 desimal untuk emas (0.000 gram) dan komoditas
    netWeight = Math.round(netWeight * 1000) / 1000;
    const unitPrice = parseFloat(harga_satuan);
    const subtotal = Math.round(netWeight * unitPrice);
    const extraCost = parseFloat(biaya_lain) || 0;
    const totalBayar = req.body.total_bayar !== undefined 
      ? Math.max(0, parseFloat(req.body.total_bayar)) 
      : Math.max(0, subtotal - extraCost);

    // Generate No Nota Unik
    const [maxRow] = await connection.query('SELECT MAX(id) as maxId FROM transaksi_beli');
    const nextId = (maxRow[0].maxId || 0) + 1;
    const dateCode = tanggal.replace(/-/g, '');
    const no_nota = `NOT-B-${dateCode}-${String(nextId).padStart(3, '0')}`;

    // Insert transaksi pembelian
    const [result] = await connection.query(
      `INSERT INTO transaksi_beli (
        no_nota, pelanggan_id, nama_pelanggan, jenis_komoditas, 
        berat_kotor, potongan_persen, potongan_nilai, berat_bersih, 
        satuan, kadar, harga_satuan, subtotal, biaya_lain, total_bayar, 
        metode_bayar, jumlah_potong_hutang, jumlah_masuk_titipan, catatan, tanggal
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        no_nota,
        pelanggan_id || null,
        nama_pelanggan || 'Pelanggan Umum',
        jenis_komoditas,
        grossWeight,
        cutPct,
        cutVal,
        netWeight,
        jenis_komoditas === 'emas' ? 'gram' : satuan,
        kadar || (jenis_komoditas === 'emas' ? '24K' : '-'),
        unitPrice,
        subtotal,
        extraCost,
        totalBayar,
        metode_bayar,
        parseFloat(jumlah_potong_hutang) || 0,
        parseFloat(jumlah_masuk_titipan) || 0,
        catatan || null,
        tanggal,
      ]
    );

    // Proses potong hutang jika pelanggan punya hutang
    if (pelanggan_id) {
      const [pelangganRows] = await connection.query(
        'SELECT * FROM pelanggan WHERE id = ? FOR UPDATE',
        [pelanggan_id]
      );

      if (pelangganRows.length > 0) {
        const cust = pelangganRows[0];
        const cutDebt = parseFloat(jumlah_potong_hutang) || (metode_bayar === 'potong_hutang' ? totalBayar : 0);

        if (cutDebt > 0 && cust.saldo_hutang > 0) {
          const actualCut = Math.min(cust.saldo_hutang, cutDebt);
          const newDebt = Math.max(0, cust.saldo_hutang - actualCut);

          // Update saldo hutang di pelanggan
          await connection.query('UPDATE pelanggan SET saldo_hutang = ? WHERE id = ?', [newDebt, pelanggan_id]);

          // Catat pembayaran hutang
          const kode_bayar = `BYR-${Date.now().toString().slice(-4)}`;
          await connection.query(
            `INSERT INTO pembayaran_hutang (
              kode_bayar, hutang_id, pelanggan_id, jumlah_bayar, metode_bayar, 
              sisa_sebelum, sisa_sesudah, catatan, tanggal
            ) VALUES (?, (SELECT id FROM hutang WHERE pelanggan_id = ? AND status != 'lunas' LIMIT 1), ?, ?, 'potong_hasil_komoditas', ?, ?, ?, ?)`,
            [
              kode_bayar,
              pelanggan_id,
              pelanggan_id,
              actualCut,
              cust.saldo_hutang,
              newDebt,
              `Potong dari nota pembelian ${no_nota} (${jenis_komoditas.toUpperCase()})`,
              tanggal,
            ]
          );
        }

        // Proses masuk tabungan titipan jika metode_bayar adalah masuk_titipan
        const addSavings = parseFloat(jumlah_masuk_titipan) || (metode_bayar === 'masuk_titipan' ? totalBayar : 0);
        if (addSavings > 0) {
          const prevSaving = cust.saldo_titipan || 0;
          const newSaving = prevSaving + addSavings;

          await connection.query('UPDATE pelanggan SET saldo_titipan = ? WHERE id = ?', [newSaving, pelanggan_id]);

          const kode_titipan = `TTP-${Date.now().toString().slice(-4)}`;
          await connection.query(
            `INSERT INTO titipan (
              kode_titipan, pelanggan_id, jenis_transaksi, jumlah, 
              saldo_sebelum, saldo_sesudah, keterangan, tanggal
            ) VALUES (?, ?, 'masuk_dari_jual_komoditas', ?, ?, ?, ?, ?)`,
            [
              kode_titipan,
              pelanggan_id,
              addSavings,
              prevSaving,
              newSaving,
              `Simpanan hasil jual ${jenis_komoditas.toUpperCase()} (${netWeight} ${jenis_komoditas === 'emas' ? 'gram' : satuan})`,
              tanggal,
            ]
          );
        }
      }
    }

    await connection.commit();

    const [newTrans] = await db.query('SELECT * FROM transaksi_beli WHERE id = ?', [result.insertId]);
    return res.status(201).json({
      success: true,
      message: `Pembelian ${jenis_komoditas.toUpperCase()} berhasil dicatat`,
      data: newTrans[0],
    });
  } catch (error) {
    await connection.rollback();
    console.error('POST /api/transaksi-beli error:', error);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
});

app.delete('/api/transaksi-beli/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.query('DELETE FROM transaksi_beli WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Transaksi beli berhasil dihapus' });
  } catch (error) {
    console.error('DELETE /api/transaksi-beli/:id error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ====================================================================
// 5. ENDPOINTS: TRANSAKSI JUAL (KASIR PENJUALAN TOKO)
// ====================================================================
app.get('/api/transaksi-jual', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : '';
    const tanggal_awal = req.query.tanggal_awal ? req.query.tanggal_awal.trim() : '';
    const tanggal_akhir = req.query.tanggal_akhir ? req.query.tanggal_akhir.trim() : '';

    let whereClause = ' WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (no_faktur LIKE ? OR nama_pelanggan LIKE ? OR kasir LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    if (tanggal_awal) {
      whereClause += ' AND tanggal >= ?';
      params.push(tanggal_awal);
    }
    if (tanggal_akhir) {
      whereClause += ' AND tanggal <= ?';
      params.push(tanggal_akhir);
    }

    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM transaksi_jual ${whereClause}`,
      params
    );
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit) || 1;

    const [sales] = await db.query(
      `SELECT * FROM transaksi_jual ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Ambil detail item per penjualan
    for (const sale of sales) {
      const [items] = await db.query(
        'SELECT * FROM transaksi_jual_detail WHERE transaksi_jual_id = ?',
        [sale.id]
      );
      sale.items = items;
    }

    return res.json({
      success: true,
      data: sales,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('GET /api/transaksi-jual error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/transaksi-jual', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      pelanggan_id,
      nama_pelanggan,
      items,
      subtotal,
      diskon = 0,
      pajak = 0,
      total_akhir,
      bayar = 0,
      kembali = 0,
      metode_bayar = 'tunai',
      jatuh_tempo = null,
      kasir = 'Admin',
      catatan = '',
      tanggal = new Date().toISOString().slice(0, 10),
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Keranjang belanja tidak boleh kosong!' });
    }

    const [maxRow] = await connection.query('SELECT MAX(id) as maxId FROM transaksi_jual');
    const nextId = (maxRow[0].maxId || 0) + 1;
    const dateCode = tanggal.replace(/-/g, '');
    const no_faktur = `INV-${dateCode}-${String(nextId).padStart(3, '0')}`;

    const isHutang = metode_bayar === 'hutang' || parseFloat(bayar) < parseFloat(total_akhir);
    const status_bayar = isHutang ? 'belum_lunas' : 'lunas';

    // Insert transaksi_jual
    const [result] = await connection.query(
      `INSERT INTO transaksi_jual (
        no_faktur, pelanggan_id, nama_pelanggan, subtotal, diskon, pajak, 
        total_akhir, bayar, kembali, metode_bayar, status_bayar, kasir, catatan, tanggal
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        no_faktur,
        pelanggan_id || null,
        nama_pelanggan || 'Pelanggan Umum',
        parseFloat(subtotal) || 0,
        parseFloat(diskon) || 0,
        parseFloat(pajak) || 0,
        parseFloat(total_akhir) || 0,
        parseFloat(bayar) || 0,
        parseFloat(kembali) || 0,
        metode_bayar,
        status_bayar,
        kasir,
        catatan || null,
        tanggal,
      ]
    );

    const transaksi_jual_id = result.insertId;

    // Insert items & kurangi stok
    for (const it of items) {
      const qty = parseFloat(it.qty) || 1;
      const harga_satuan = parseFloat(it.harga_satuan) || 0;
      const itemSubtotal = qty * harga_satuan;

      await connection.query(
        `INSERT INTO transaksi_jual_detail (
          transaksi_jual_id, produk_id, kode_produk, nama_produk, qty, satuan, harga_satuan, subtotal
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          transaksi_jual_id,
          it.produk_id || null,
          it.kode_produk || null,
          it.nama_produk || 'Barang',
          qty,
          it.satuan || 'pcs',
          harga_satuan,
          itemSubtotal,
        ]
      );

      // Kurangi stok produk jika produk_id ada
      if (it.produk_id) {
        await connection.query(
          'UPDATE produk SET stok = GREATEST(0, stok - ?) WHERE id = ?',
          [qty, it.produk_id]
        );
      }
    }

    // Jika penjualan kasbon/hutang
    if (status_bayar === 'belum_lunas' && pelanggan_id) {
      const debtAmount = Math.max(0, parseFloat(total_akhir) - parseFloat(bayar));
      const kode_hutang = `HTG-${Date.now().toString().slice(-4)}`;

      await connection.query(
        `INSERT INTO hutang (
          kode_hutang, pelanggan_id, transaksi_jual_id, tipe, jumlah_hutang, 
          sisa_hutang, status, jatuh_tempo, keterangan, tanggal
        ) VALUES (?, ?, ?, 'bon_belanja', ?, ?, 'belum_lunas', ?, ?, ?)`,
        [
          kode_hutang,
          pelanggan_id,
          transaksi_jual_id,
          debtAmount,
          debtAmount,
          jatuh_tempo || null,
          `Bon belanja faktur ${no_faktur}`,
          tanggal,
        ]
      );

      await connection.query(
        'UPDATE pelanggan SET saldo_hutang = saldo_hutang + ? WHERE id = ?',
        [debtAmount, pelanggan_id]
      );
    }

    // Jika bayar menggunakan saldo titipan/tabungan
    if (metode_bayar === 'saldo_titipan' && pelanggan_id) {
      const [custRows] = await connection.query('SELECT saldo_titipan FROM pelanggan WHERE id = ?', [pelanggan_id]);
      if (custRows.length > 0) {
        const prevBal = custRows[0].saldo_titipan || 0;
        const newBal = Math.max(0, prevBal - parseFloat(total_akhir));
        await connection.query('UPDATE pelanggan SET saldo_titipan = ? WHERE id = ?', [newBal, pelanggan_id]);

        const kode_titipan = `TTP-${Date.now().toString().slice(-4)}`;
        await connection.query(
          `INSERT INTO titipan (
            kode_titipan, pelanggan_id, jenis_transaksi, jumlah, 
            saldo_sebelum, saldo_sesudah, keterangan, tanggal
          ) VALUES (?, ?, 'potong_bayar_belanja', ?, ?, ?, ?, ?)`,
          [
            kode_titipan,
            pelanggan_id,
            parseFloat(total_akhir),
            prevBal,
            newBal,
            `Bayar belanja kasir faktur ${no_faktur}`,
            tanggal,
          ]
        );
      }
    }

    await connection.commit();

    const [newSale] = await db.query('SELECT * FROM transaksi_jual WHERE id = ?', [transaksi_jual_id]);
    const [saleDetails] = await db.query('SELECT * FROM transaksi_jual_detail WHERE transaksi_jual_id = ?', [transaksi_jual_id]);
    newSale[0].items = saleDetails;

    return res.status(201).json({
      success: true,
      message: 'Transaksi penjualan berhasil disimpan',
      data: newSale[0],
    });
  } catch (error) {
    await connection.rollback();
    console.error('POST /api/transaksi-jual error:', error);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
});

// ====================================================================
// 6. ENDPOINTS: HUTANG & BAYAR HUTANG PELANGGAN
// ====================================================================
app.get('/api/hutang', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : '';
    const status = req.query.status ? req.query.status.trim() : '';
    const pelanggan_id = req.query.pelanggan_id ? parseInt(req.query.pelanggan_id, 10) : null;

    let whereClause = ' WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (h.kode_hutang LIKE ? OR p.nama LIKE ? OR h.keterangan LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    if (status) {
      whereClause += ' AND h.status = ?';
      params.push(status);
    }
    if (pelanggan_id) {
      whereClause += ' AND h.pelanggan_id = ?';
      params.push(pelanggan_id);
    }

    const [countResult] = await db.query(
      `SELECT COUNT(*) as total 
       FROM hutang h 
       JOIN pelanggan p ON h.pelanggan_id = p.id 
       ${whereClause}`,
      params
    );
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit) || 1;

    const [rows] = await db.query(
      `SELECT h.*, p.nama as nama_pelanggan, p.no_hp as no_hp_pelanggan 
       FROM hutang h 
       JOIN pelanggan p ON h.pelanggan_id = p.id 
       ${whereClause} 
       ORDER BY h.id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('GET /api/hutang error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/hutang', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      pelanggan_id,
      tipe = 'kasbon_tunai',
      jumlah_hutang,
      jatuh_tempo,
      keterangan,
      tanggal = new Date().toISOString().slice(0, 10),
    } = req.body;

    if (!pelanggan_id || !jumlah_hutang) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Pelanggan dan jumlah hutang wajib diisi!' });
    }

    const amount = parseFloat(jumlah_hutang);
    const kode_hutang = `HTG-${Date.now().toString().slice(-4)}`;

    const [result] = await connection.query(
      `INSERT INTO hutang (
        kode_hutang, pelanggan_id, tipe, jumlah_hutang, sisa_hutang, 
        status, jatuh_tempo, keterangan, tanggal
      ) VALUES (?, ?, ?, ?, ?, 'belum_lunas', ?, ?, ?)`,
      [kode_hutang, pelanggan_id, tipe, amount, amount, jatuh_tempo || null, keterangan || 'Kasbon tunai', tanggal]
    );

    // Update saldo hutang di master pelanggan
    await connection.query(
      'UPDATE pelanggan SET saldo_hutang = saldo_hutang + ? WHERE id = ?',
      [amount, pelanggan_id]
    );

    await connection.commit();

    const [newHutang] = await db.query(
      'SELECT h.*, p.nama as nama_pelanggan FROM hutang h JOIN pelanggan p ON h.pelanggan_id = p.id WHERE h.id = ?',
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: 'Hutang / Kasbon berhasil dicatat',
      data: newHutang[0],
    });
  } catch (error) {
    await connection.rollback();
    console.error('POST /api/hutang error:', error);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
});

// Pembayaran Hutang
app.get('/api/pembayaran-hutang', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : '';
    const pelanggan_id = req.query.pelanggan_id ? parseInt(req.query.pelanggan_id, 10) : null;

    let whereClause = ' WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (b.kode_bayar LIKE ? OR p.nama LIKE ? OR b.catatan LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    if (pelanggan_id) {
      whereClause += ' AND b.pelanggan_id = ?';
      params.push(pelanggan_id);
    }

    const [countResult] = await db.query(
      `SELECT COUNT(*) as total 
       FROM pembayaran_hutang b 
       JOIN pelanggan p ON b.pelanggan_id = p.id 
       ${whereClause}`,
      params
    );
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit) || 1;

    const [rows] = await db.query(
      `SELECT b.*, p.nama as nama_pelanggan 
       FROM pembayaran_hutang b 
       JOIN pelanggan p ON b.pelanggan_id = p.id 
       ${whereClause} 
       ORDER BY b.id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('GET /api/pembayaran-hutang error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/pembayaran-hutang', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      hutang_id,
      pelanggan_id,
      jumlah_bayar,
      metode_bayar = 'tunai',
      catatan = '',
      tanggal = new Date().toISOString().slice(0, 10),
    } = req.body;

    let targetPelangganId = pelanggan_id;
    if (!targetPelangganId && hutang_id) {
      const [hRows] = await connection.query('SELECT pelanggan_id FROM hutang WHERE id = ?', [hutang_id]);
      if (hRows.length > 0) {
        targetPelangganId = hRows[0].pelanggan_id;
      }
    }

    if (!targetPelangganId || !jumlah_bayar) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Pelanggan dan jumlah bayar wajib diisi!' });
    }

    const payAmount = parseFloat(jumlah_bayar);

    const [custRows] = await connection.query(
      'SELECT * FROM pelanggan WHERE id = ? FOR UPDATE',
      [targetPelangganId]
    );
    if (custRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Pelanggan tidak ditemukan' });
    }

    const cust = custRows[0];
    const prevDebt = cust.saldo_hutang || 0;
    const newDebt = Math.max(0, prevDebt - payAmount);

    // Update hutang pelanggan
    await connection.query('UPDATE pelanggan SET saldo_hutang = ? WHERE id = ?', [newDebt, targetPelangganId]);

    // Jika ada hutang_id spesifik, kurangi sisa_hutang pada tabel hutang
    if (hutang_id) {
      const [hRows] = await connection.query('SELECT * FROM hutang WHERE id = ? FOR UPDATE', [hutang_id]);
      if (hRows.length > 0) {
        const remaining = Math.max(0, hRows[0].sisa_hutang - payAmount);
        const newStatus = remaining <= 0 ? 'lunas' : 'sebagian';
        await connection.query(
          'UPDATE hutang SET sisa_hutang = ?, status = ? WHERE id = ?',
          [remaining, newStatus, hutang_id]
        );
      }
    }

    // Jika bayar menggunakan saldo titipan
    if (metode_bayar === 'saldo_titipan') {
      const prevSaving = cust.saldo_titipan || 0;
      const newSaving = Math.max(0, prevSaving - payAmount);
      await connection.query('UPDATE pelanggan SET saldo_titipan = ? WHERE id = ?', [newSaving, targetPelangganId]);

      const kode_titipan = `TTP-${Date.now().toString().slice(-4)}`;
      await connection.query(
        `INSERT INTO titipan (
          kode_titipan, pelanggan_id, jenis_transaksi, jumlah, 
          saldo_sebelum, saldo_sesudah, keterangan, tanggal
        ) VALUES (?, ?, 'potong_bayar_hutang', ?, ?, ?, ?, ?)`,
        [
          kode_titipan,
          targetPelangganId,
          payAmount,
          prevSaving,
          newSaving,
          'Pelunasan hutang menggunakan saldo tabungan/titipan',
          tanggal,
        ]
      );
    }

    const kode_bayar = `BYR-${Date.now().toString().slice(-4)}`;
    const [result] = await connection.query(
      `INSERT INTO pembayaran_hutang (
        kode_bayar, hutang_id, pelanggan_id, jumlah_bayar, metode_bayar, 
        sisa_sebelum, sisa_sesudah, catatan, tanggal
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [kode_bayar, hutang_id || null, targetPelangganId, payAmount, metode_bayar, prevDebt, newDebt, catatan || null, tanggal]
    );

    await connection.commit();

    const [newPay] = await db.query(
      'SELECT b.*, p.nama as nama_pelanggan FROM pembayaran_hutang b JOIN pelanggan p ON b.pelanggan_id = p.id WHERE b.id = ?',
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: 'Pembayaran hutang berhasil dicatat',
      data: newPay[0],
    });
  } catch (error) {
    await connection.rollback();
    console.error('POST /api/pembayaran-hutang error:', error);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
});

// ====================================================================
// 7. ENDPOINTS: TITIP (TABUNGAN PELANGGAN / SIMPANAN PETANI)
// ====================================================================
app.get('/api/titipan', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : '';
    const jenis = req.query.jenis ? req.query.jenis.trim() : '';
    const pelanggan_id = req.query.pelanggan_id ? parseInt(req.query.pelanggan_id, 10) : null;

    let whereClause = ' WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (t.kode_titipan LIKE ? OR p.nama LIKE ? OR t.keterangan LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    if (jenis) {
      whereClause += ' AND t.jenis_transaksi = ?';
      params.push(jenis);
    }
    if (pelanggan_id) {
      whereClause += ' AND t.pelanggan_id = ?';
      params.push(pelanggan_id);
    }

    const [countResult] = await db.query(
      `SELECT COUNT(*) as total 
       FROM titipan t 
       JOIN pelanggan p ON t.pelanggan_id = p.id 
       ${whereClause}`,
      params
    );
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit) || 1;

    const [rows] = await db.query(
      `SELECT t.*, p.nama as nama_pelanggan, p.no_hp as no_hp_pelanggan 
       FROM titipan t 
       JOIN pelanggan p ON t.pelanggan_id = p.id 
       ${whereClause} 
       ORDER BY t.id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('GET /api/titipan error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/titipan', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      pelanggan_id,
      jenis_transaksi, // 'setor' | 'tarik'
      jumlah,
      keterangan = '',
      tanggal = new Date().toISOString().slice(0, 10),
    } = req.body;

    if (!pelanggan_id || !jenis_transaksi || !jumlah) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Pelanggan, jenis transaksi, dan jumlah wajib diisi!' });
    }

    const amount = parseFloat(jumlah);

    const [custRows] = await connection.query(
      'SELECT * FROM pelanggan WHERE id = ? FOR UPDATE',
      [pelanggan_id]
    );
    if (custRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Pelanggan tidak ditemukan' });
    }

    const cust = custRows[0];
    const prevBalance = cust.saldo_titipan || 0;

    if (jenis_transaksi === 'tarik' && prevBalance < amount) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Saldo tabungan titipan tidak mencukupi untuk ditarik!' });
    }

    const newBalance = jenis_transaksi === 'setor' ? prevBalance + amount : prevBalance - amount;

    await connection.query('UPDATE pelanggan SET saldo_titipan = ? WHERE id = ?', [newBalance, pelanggan_id]);

    const kode_titipan = `TTP-${Date.now().toString().slice(-4)}`;
    const [result] = await connection.query(
      `INSERT INTO titipan (
        kode_titipan, pelanggan_id, jenis_transaksi, jumlah, 
        saldo_sebelum, saldo_sesudah, keterangan, tanggal
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [kode_titipan, pelanggan_id, jenis_transaksi, amount, prevBalance, newBalance, keterangan || null, tanggal]
    );

    await connection.commit();

    const [newTitipan] = await db.query(
      'SELECT t.*, p.nama as nama_pelanggan FROM titipan t JOIN pelanggan p ON t.pelanggan_id = p.id WHERE t.id = ?',
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: `Transaksi ${jenis_transaksi === 'setor' ? 'setoran' : 'penarikan'} tabungan berhasil dicatat`,
      data: newTitipan[0],
    });
  } catch (error) {
    await connection.rollback();
    console.error('POST /api/titipan error:', error);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
});

// ====================================================================
// 8. ENDPOINTS: LAPORAN & GRAFIK ANALITIK
// ====================================================================
app.get('/api/laporan/ringkasan', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // Total akumulasi
    const [beliSum] = await db.query('SELECT COALESCE(SUM(total_bayar), 0) as total FROM transaksi_beli');
    const [jualSum] = await db.query('SELECT COALESCE(SUM(total_akhir), 0) as total FROM transaksi_jual');
    const [hutangSum] = await db.query('SELECT COALESCE(SUM(saldo_hutang), 0) as total FROM pelanggan');
    const [titipanSum] = await db.query('SELECT COALESCE(SUM(saldo_titipan), 0) as total FROM pelanggan');

    // Hari ini
    const [beliHariIni] = await db.query('SELECT COALESCE(SUM(total_bayar), 0) as total FROM transaksi_beli WHERE tanggal = ?', [today]);
    const [jualHariIni] = await db.query('SELECT COALESCE(SUM(total_akhir), 0) as total FROM transaksi_jual WHERE tanggal = ?', [today]);

    // Total komoditas
    const [emasSum] = await db.query("SELECT COALESCE(SUM(berat_bersih), 0) as total FROM transaksi_beli WHERE jenis_komoditas = 'emas'");
    const [sawitSum] = await db.query("SELECT COALESCE(SUM(berat_bersih), 0) as total FROM transaksi_beli WHERE jenis_komoditas = 'sawit'");
    const [karetSum] = await db.query("SELECT COALESCE(SUM(berat_bersih), 0) as total FROM transaksi_beli WHERE jenis_komoditas = 'karet'");

    return res.json({
      success: true,
      data: {
        total_pembelian: parseFloat(beliSum[0].total),
        total_penjualan: parseFloat(jualSum[0].total),
        total_hutang: parseFloat(hutangSum[0].total),
        total_titipan: parseFloat(titipanSum[0].total),
        hari_ini: {
          beli: parseFloat(beliHariIni[0].total),
          jual: parseFloat(jualHariIni[0].total),
        },
        komoditas: {
          emas_gram: parseFloat(emasSum[0].total),
          sawit_kg: parseFloat(sawitSum[0].total),
          karet_kg: parseFloat(karetSum[0].total),
        },
      },
    });
  } catch (error) {
    console.error('GET /api/laporan/ringkasan error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Laporan Periodik (Harian, Bulanan, Tahunan)
app.get('/api/laporan/periodik', async (req, res) => {
  try {
    const { periode = 'harian', startDate, endDate } = req.query;

    let dateFormat = '%Y-%m-%d';
    if (periode === 'bulanan') dateFormat = '%Y-%m';
    if (periode === 'tahunan') dateFormat = '%Y';

    let filterBeli = '';
    let filterJual = '';
    const unionBeliParams = [dateFormat];
    const unionJualParams = [dateFormat];
    const beliParams = [];
    const jualParams = [];

    if (startDate) {
      filterBeli += ' AND tanggal >= ?';
      filterJual += ' AND tanggal >= ?';
      unionBeliParams.push(startDate);
      unionJualParams.push(startDate);
      beliParams.push(startDate);
      jualParams.push(startDate);
    }
    if (endDate) {
      filterBeli += ' AND tanggal <= ?';
      filterJual += ' AND tanggal <= ?';
      unionBeliParams.push(endDate);
      unionJualParams.push(endDate);
      beliParams.push(endDate);
      jualParams.push(endDate);
    }
    beliParams.unshift(dateFormat);
    beliParams.push(dateFormat);
    jualParams.unshift(dateFormat);
    jualParams.push(dateFormat);

    const query = `
      SELECT 
        period_data.label,
        COALESCE(beli.total_beli, 0) as beli,
        COALESCE(jual.total_jual, 0) as jual,
        COALESCE(beli.emas_gr, 0) as emas_gr,
        COALESCE(beli.sawit_kg, 0) as sawit_kg,
        COALESCE(beli.karet_kg, 0) as karet_kg
      FROM (
        SELECT DISTINCT DATE_FORMAT(tanggal, ?) as label FROM transaksi_beli WHERE 1=1 ${filterBeli}
        UNION
        SELECT DISTINCT DATE_FORMAT(tanggal, ?) as label FROM transaksi_jual WHERE 1=1 ${filterJual}
      ) period_data
      LEFT JOIN (
        SELECT 
          DATE_FORMAT(tanggal, ?) as label,
          SUM(total_bayar) as total_beli,
          SUM(CASE WHEN jenis_komoditas = 'emas' THEN berat_bersih ELSE 0 END) as emas_gr,
          SUM(CASE WHEN jenis_komoditas = 'sawit' THEN berat_bersih ELSE 0 END) as sawit_kg,
          SUM(CASE WHEN jenis_komoditas = 'karet' THEN berat_bersih ELSE 0 END) as karet_kg
        FROM transaksi_beli
        WHERE 1=1 ${filterBeli}
        GROUP BY DATE_FORMAT(tanggal, ?)
      ) beli ON period_data.label = beli.label
      LEFT JOIN (
        SELECT 
          DATE_FORMAT(tanggal, ?) as label,
          SUM(total_akhir) as total_jual
        FROM transaksi_jual
        WHERE 1=1 ${filterJual}
        GROUP BY DATE_FORMAT(tanggal, ?)
      ) jual ON period_data.label = jual.label
      ORDER BY period_data.label DESC
      LIMIT 100
    `;

    const allParams = [
      ...unionBeliParams,
      ...unionJualParams,
      ...beliParams,
      ...jualParams,
    ];

    const [rows] = await db.query(query, allParams);

    return res.json({
      success: true,
      data: rows,
      meta: { periode, startDate: startDate || null, endDate: endDate || null },
    });
  } catch (error) {
    console.error('GET /api/laporan/periodik error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  let dbStatus = false;
  try {
    const conn = await db.getConnection();
    await conn.ping();
    conn.release();
    dbStatus = true;
  } catch (e) {
    dbStatus = false;
  }

  return res.json({
    success: true,
    message: 'Berkah POS API is healthy & running',
    timestamp: new Date().toISOString(),
    mysqlConnected: dbStatus,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server error handler:', err);
  return res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Berkah POS Backend berjalan di port http://localhost:${PORT}`);
});
