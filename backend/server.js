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
  multipleStatements: true,
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

    // Auto-fix data lama jika transaksi NOT-B-20260918-012 masih tercatat 150750 (seharusnya 2010000)
    try {
      await conn.query("UPDATE transaksi_beli SET subtotal = 2010000.00, total_bayar = 2010000.00 WHERE no_nota = 'NOT-B-20260918-012' AND (total_bayar = 150750.00 OR subtotal = 1809000.00)");
      await conn.query("UPDATE kas SET jumlah = 2010000.00 WHERE referensi_id = 'NOT-B-20260918-012' AND jumlah = 150750.00");
    } catch (e) {
      // ignore
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


// Middleware: Verifikasi Token Otentikasi
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized - Token otentikasi tidak ditemukan' });
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
      return res.status(401).json({ success: false, message: 'User tidak ditemukan atau status nonaktif' });
    }

    req.user = rows[0];
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Middleware: Khusus Bos / Admin
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Akses ditolak! Menu ini hanya dapat diakses oleh Bos / Administrator.',
    });
  }
  next();
};

// ====================================================================
// ENDPOINTS: MANAJEMEN PEGAWAI / PENGGUNA (CRUD)
// ====================================================================

// GET /api/users - Daftar pegawai
app.get('/api/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : '';
    const role = req.query.role ? req.query.role.trim() : '';
    const status = req.query.status ? req.query.status.trim() : '';

    let whereClause = ' WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (nama LIKE ? OR username LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (role) {
      whereClause += ' AND role = ?';
      params.push(role);
    }
    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    );
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit) || 1;

    const [rows] = await db.query(
      `SELECT id, username, nama, role, status, created_at, updated_at 
       FROM users ${whereClause} 
       ORDER BY (role = 'admin') DESC, id ASC 
       LIMIT ? OFFSET ?`,
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
    console.error('GET /api/users error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/users - Tambah pegawai baru
app.post('/api/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { username, password, nama, role = 'kasir', status = 'aktif' } = req.body;

    if (!username || !password || !nama) {
      return res.status(400).json({
        success: false,
        message: 'Username, password, dan nama pegawai wajib diisi!',
      });
    }

    const cleanUsername = username.trim().toLowerCase();
    const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [cleanUsername]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Username '${cleanUsername}' sudah digunakan! Silakan gunakan username lain.`,
      });
    }

    const [result] = await db.query(
      'INSERT INTO users (username, password, nama, role, status) VALUES (?, ?, ?, ?, ?)',
      [cleanUsername, password.trim(), nama.trim(), role, status]
    );

    return res.status(201).json({
      success: true,
      message: `Akun pegawai '${nama}' berhasil ditambahkan!`,
      data: {
        id: result.insertId,
        username: cleanUsername,
        nama: nama.trim(),
        role,
        status,
      },
    });
  } catch (error) {
    console.error('POST /api/users error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/users/:id - Update pegawai
app.put('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { username, password, nama, role, status } = req.body;

    const [current] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (current.length === 0) {
      return res.status(404).json({ success: false, message: 'Pegawai tidak ditemukan!' });
    }

    const user = current[0];

    // Cek duplikasi username jika diubah
    if (username && username.trim().toLowerCase() !== user.username) {
      const cleanUsername = username.trim().toLowerCase();
      const [existing] = await db.query('SELECT id FROM users WHERE username = ? AND id != ?', [cleanUsername, userId]);
      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Username '${cleanUsername}' sudah digunakan oleh pengguna lain!`,
        });
      }
    }

    // Proteksi: jangan menonaktifkan atau menurunkan role admin terakhir
    if (user.role === 'admin' && (role === 'kasir' || status === 'nonaktif')) {
      const [adminCount] = await db.query(
        "SELECT COUNT(*) as total FROM users WHERE role = 'admin' AND status = 'aktif' AND id != ?",
        [userId]
      );
      if (adminCount[0].total === 0) {
        return res.status(400).json({
          success: false,
          message: 'Tidak dapat menonaktifkan atau mengubah role satu-satunya Bos/Admin aktif!',
        });
      }
    }

    const newUsername = username ? username.trim().toLowerCase() : user.username;
    const newNama = nama ? nama.trim() : user.nama;
    const newRole = role || user.role;
    const newStatus = status || user.status;
    const newPassword = password && password.trim() !== '' ? password.trim() : user.password;

    await db.query(
      'UPDATE users SET username = ?, password = ?, nama = ?, role = ?, status = ? WHERE id = ?',
      [newUsername, newPassword, newNama, newRole, newStatus, userId]
    );

    return res.json({
      success: true,
      message: 'Data pegawai berhasil diperbarui!',
      data: {
        id: userId,
        username: newUsername,
        nama: newNama,
        role: newRole,
        status: newStatus,
      },
    });
  } catch (error) {
    console.error('PUT /api/users/:id error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/users/:id - Hapus pegawai
app.delete('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);

    // Proteksi: tidak bisa menghapus akun yang sedang login
    if (req.user && req.user.id === userId) {
      return res.status(400).json({
        success: false,
        message: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang digunakan login!',
      });
    }

    const [current] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (current.length === 0) {
      return res.status(404).json({ success: false, message: 'Pegawai tidak ditemukan!' });
    }

    // Proteksi: tidak bisa menghapus admin terakhir
    if (current[0].role === 'admin') {
      const [adminCount] = await db.query(
        "SELECT COUNT(*) as total FROM users WHERE role = 'admin' AND id != ?",
        [userId]
      );
      if (adminCount[0].total === 0) {
        return res.status(400).json({
          success: false,
          message: 'Tidak dapat menghapus Bos/Admin terakhir dalam sistem!',
        });
      }
    }

    await db.query('DELETE FROM users WHERE id = ?', [userId]);

    return res.json({
      success: true,
      message: `Akun pegawai '${current[0].nama}' berhasil dihapus!`,
    });
  } catch (error) {
    console.error('DELETE /api/users/:id error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ====================================================================
// ENDPOINTS: RESET DATA SISTEM (KHUSUS BOS / ADMIN)
// ====================================================================

// POST /api/pengaturan/reset-transaksi - Reset riwayat transaksi operasional
app.post('/api/pengaturan/reset-transaksi', requireAuth, requireAdmin, async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('DELETE FROM transaksi_jual_detail');
    await connection.query('DELETE FROM transaksi_jual');
    await connection.query('DELETE FROM transaksi_beli');
    await connection.query('DELETE FROM pembayaran_hutang');
    await connection.query('DELETE FROM hutang');
    await connection.query('DELETE FROM titipan');
    await connection.query('DELETE FROM kas');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    // Reset saldo hutang dan titipan mitra
    await connection.query('UPDATE pelanggan SET saldo_hutang = 0, saldo_titipan = 0');

    // Reset stok komoditas
    await connection.query("UPDATE produk SET stok = 0 WHERE kode IN ('KMD-EMAS', 'KMD-SAWIT', 'KMD-KARET')");

    // Inisialisasi kas modal awal baru
    const today = new Date().toISOString().slice(0, 10);
    await connection.query(
      `INSERT INTO kas (kode_transaksi, tipe, kategori, jumlah, sumber, keterangan, tanggal)
       VALUES (?, 'masuk', 'Modal Awal', 10000000.00, 'manual', 'Modal kas awal toko setelah reset transaksi', ?)`,
      [`KAS-RESET-${Date.now().toString().slice(-4)}`, today]
    );

    await connection.commit();
    return res.json({
      success: true,
      message: 'Riwayat transaksi berhasil di-reset bersih! Master data pelanggan, produk, dan akun pegawai tetap tersimpan aman.',
    });
  } catch (error) {
    await connection.rollback();
    console.error('POST /api/pengaturan/reset-transaksi error:', error);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
});

// POST /api/pengaturan/reset-total - Factory reset total dari database.sql
app.post('/api/pengaturan/reset-total', requireAuth, requireAdmin, async (req, res) => {
  try {
    const sqlPath = path.join(__dirname, 'sql', 'database.sql');
    if (!fs.existsSync(sqlPath)) {
      return res.status(404).json({ success: false, message: 'File database.sql tidak ditemukan!' });
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    const conn = await db.getConnection();
    try {
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');
      await conn.query(sqlContent);
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');

      return res.json({
        success: true,
        message: 'Database berhasil di-reset total ke pengaturan dan data awal (Factory Reset)!',
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('POST /api/pengaturan/reset-total error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
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
    const grossTotal = Math.round(grossWeight * unitPrice);
    const subtotal = req.body.subtotal !== undefined
      ? parseFloat(req.body.subtotal)
      : (jenis_komoditas === 'emas' ? grossTotal : Math.round(netWeight * unitPrice));
    const extraCost = parseFloat(biaya_lain) || 0;
    const totalBayar = req.body.total_bayar !== undefined 
      ? Math.max(0, parseFloat(req.body.total_bayar)) 
      : (jenis_komoditas === 'emas' ? Math.max(0, grossTotal - extraCost) : Math.max(0, subtotal - extraCost));

    // Generate No Nota Unik
    const [maxRow] = await connection.query('SELECT MAX(id) as maxId FROM transaksi_beli');
    const nextId = (maxRow[0].maxId || 0) + 1;
    const dateCode = tanggal.replace(/-/g, '');
    const no_nota = `NOT-B-${dateCode}-${String(nextId).padStart(3, '0')}`;

    // Hitung pengeluaran uang kas nyata untuk pembelian ini
    const tunaiKeluar = (metode_bayar === 'tunai' || metode_bayar === 'transfer')
      ? Math.max(0, totalBayar - (parseFloat(jumlah_potong_hutang) || 0) - (parseFloat(jumlah_masuk_titipan) || 0))
      : 0;

    // Validasi ketersediaan saldo uang kas toko
    if (tunaiKeluar > 0) {
      const [kasSummary] = await connection.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN tipe = 'masuk' THEN jumlah ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN tipe = 'keluar' THEN jumlah ELSE 0 END), 0) AS saldo_kas
        FROM kas
      `);
      const currentSaldoKas = parseFloat(kasSummary[0]?.saldo_kas) || 0;

      if (currentSaldoKas < tunaiKeluar) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Saldo uang kas tidak mencukupi untuk pembayaran ini! Sisa uang kas toko saat ini hanya Rp ${Math.round(currentSaldoKas).toLocaleString('id-ID')}, sedangkan pembayaran membutuhkan Rp ${Math.round(tunaiKeluar).toLocaleString('id-ID')}. Silakan siapkan uang kas modal belanja terlebih dahulu di menu Uang Kas Toko.`,
        });
      }
    }

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

        const prevCustDebt = parseFloat(cust.saldo_hutang) || 0;
        if (cutDebt > 0 && prevCustDebt > 0) {
          const actualCut = Math.min(prevCustDebt, cutDebt);
          const newDebt = Number(Math.max(0, prevCustDebt - actualCut).toFixed(2));

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
              prevCustDebt,
              newDebt,
              `Potong dari nota pembelian ${no_nota} (${jenis_komoditas.toUpperCase()})`,
              tanggal,
            ]
          );
        }

        // Proses masuk tabungan titipan jika metode_bayar adalah masuk_titipan
        const addSavings = parseFloat(jumlah_masuk_titipan) || (metode_bayar === 'masuk_titipan' ? totalBayar : 0);
        if (addSavings > 0) {
          const prevSaving = parseFloat(cust.saldo_titipan) || 0;
          const newSaving = Number((prevSaving + addSavings).toFixed(2));

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

    // Otomatis sinkronkan pembelian ke stok produk kasir (KMD-EMAS, KMD-SAWIT, KMD-KARET)
    const kodeProduk = `KMD-${jenis_komoditas.toUpperCase()}`;
    const [existProd] = await connection.query(
      'SELECT id, stok FROM produk WHERE kode = ? FOR UPDATE',
      [kodeProduk]
    );

    if (existProd.length > 0) {
      await connection.query(
        'UPDATE produk SET stok = stok + ?, harga_beli = ? WHERE kode = ?',
        [netWeight, unitPrice, kodeProduk]
      );
    } else {
      let namaProd = 'Emas Murni / Leburan';
      let katProd = 'Perhiasan Emas';
      let satProd = 'gram';
      let defaultJual = unitPrice;

      if (jenis_komoditas === 'sawit') {
        namaProd = 'Kelapa Sawit (TBS)';
        katProd = 'Pertanian';
        satProd = 'kg';
      } else if (jenis_komoditas === 'karet') {
        namaProd = 'Karet Rakyat';
        katProd = 'Pertanian';
        satProd = 'kg';
      } else {
        namaProd = `Komoditas ${jenis_komoditas.toUpperCase()}`;
        katProd = 'Umum';
        satProd = satuan || 'kg';
      }

      await connection.query(
        `INSERT INTO produk (kode, nama, kategori, satuan, harga_beli, harga_jual, stok, deskripsi)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          kodeProduk,
          namaProd,
          katProd,
          satProd,
          unitPrice,
          defaultJual,
          netWeight,
          `Stok otomatis dari pembelian komoditas ${jenis_komoditas.toUpperCase()}`,
        ]
      );
    }

    // Otomatis kurangi uang kas toko (catat pengeluaran kas)
    if (tunaiKeluar > 0) {
      const [maxKas] = await connection.query('SELECT MAX(id) as maxId FROM kas');
      const nextKasId = (maxKas[0]?.maxId || 0) + 1;
      const kode_kas = `KAS-OUT-${dateCode}-${String(nextKasId).padStart(3, '0')}`;
      const namaKomoditas = jenis_komoditas === 'emas' ? 'Emas' : jenis_komoditas === 'sawit' ? 'Sawit' : jenis_komoditas === 'karet' ? 'Karet' : jenis_komoditas.toUpperCase();

      await connection.query(
        `INSERT INTO kas (
          kode_transaksi, tipe, kategori, jumlah, sumber, referensi_id, keterangan, tanggal
        ) VALUES (?, 'keluar', ?, ?, 'komoditas', ?, ?, ?)`,
        [
          kode_kas,
          `Beli ${namaKomoditas}`,
          tunaiKeluar,
          no_nota,
          `Pembelian ${namaKomoditas} (${netWeight} ${jenis_komoditas === 'emas' ? 'gram' : satuan}) - Nota ${no_nota} - ${nama_pelanggan || 'Pelanggan Umum'}`,
          tanggal,
        ]
      );
    }

    await connection.commit();

    const [newTrans] = await db.query('SELECT * FROM transaksi_beli WHERE id = ?', [result.insertId]);
    return res.status(201).json({
      success: true,
      message: `Pembelian ${jenis_komoditas.toUpperCase()} berhasil dicatat, stok produk ditambah, dan uang kas berkurang`,
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
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const id = parseInt(req.params.id, 10);
    const [rows] = await connection.query('SELECT * FROM transaksi_beli WHERE id = ?', [id]);
    if (rows.length > 0) {
      const trans = rows[0];
      const kodeProduk = `KMD-${trans.jenis_komoditas.toUpperCase()}`;
      await connection.query(
        'UPDATE produk SET stok = GREATEST(0, stok - ?) WHERE kode = ?',
        [parseFloat(trans.berat_bersih) || 0, kodeProduk]
      );
      // Hapus otomatis catatan pengeluaran kas terkait agar saldo uang kas toko kembali (rollback kas)
      await connection.query(
        "DELETE FROM kas WHERE referensi_id = ? AND sumber = 'komoditas'",
        [trans.no_nota]
      );
      await connection.query('DELETE FROM transaksi_beli WHERE id = ?', [id]);
    }
    await connection.commit();
    return res.json({ success: true, message: 'Transaksi beli berhasil dihapus, stok disesuaikan, dan uang kas dikembalikan' });
  } catch (error) {
    await connection.rollback();
    console.error('DELETE /api/transaksi-beli/:id error:', error);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
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
        const prevBal = parseFloat(custRows[0].saldo_titipan) || 0;
        const totalAkhir = parseFloat(total_akhir) || 0;
        const newBal = Number(Math.max(0, prevBal - totalAkhir).toFixed(2));
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

    // Jika penjualan tunai di kasir, catat otomatis uang kas masuk toko
    if (metode_bayar === 'tunai' && parseFloat(total_akhir) > 0) {
      const nominalKasMasuk = Math.min(parseFloat(bayar) || 0, parseFloat(total_akhir) || 0);
      if (nominalKasMasuk > 0) {
        const [maxKas] = await connection.query('SELECT MAX(id) as maxId FROM kas');
        const nextKasId = (maxKas[0]?.maxId || 0) + 1;
        const kode_kas = `KAS-IN-${dateCode}-${String(nextKasId).padStart(3, '0')}`;
        await connection.query(
          `INSERT INTO kas (
            kode_transaksi, tipe, kategori, jumlah, sumber, referensi_id, keterangan, tanggal
          ) VALUES (?, 'masuk', 'Penjualan Kasir', ?, 'kasir', ?, ?, ?)`,
          [
            kode_kas,
            nominalKasMasuk,
            no_faktur,
            `Penjualan kasir faktur ${no_faktur} - ${nama_pelanggan || 'Pelanggan Umum'}`,
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
    const prevDebt = parseFloat(cust.saldo_hutang) || 0;
    const newDebt = Number(Math.max(0, prevDebt - payAmount).toFixed(2));

    // Update hutang pelanggan
    await connection.query('UPDATE pelanggan SET saldo_hutang = ? WHERE id = ?', [newDebt, targetPelangganId]);

    // Jika ada hutang_id spesifik, kurangi sisa_hutang pada tabel hutang
    if (hutang_id) {
      const [hRows] = await connection.query('SELECT * FROM hutang WHERE id = ? FOR UPDATE', [hutang_id]);
      if (hRows.length > 0) {
        const remaining = Math.max(0, (parseFloat(hRows[0].sisa_hutang) || 0) - payAmount);
        const newStatus = remaining <= 0 ? 'lunas' : 'sebagian';
        await connection.query(
          'UPDATE hutang SET sisa_hutang = ?, status = ? WHERE id = ?',
          [Number(remaining.toFixed(2)), newStatus, hutang_id]
        );
      }
    }

    // Jika bayar menggunakan saldo titipan
    if (metode_bayar === 'saldo_titipan') {
      const prevSaving = parseFloat(cust.saldo_titipan) || 0;
      const newSaving = Number(Math.max(0, prevSaving - payAmount).toFixed(2));
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

    // Jika pelunasan hutang secara tunai, catat otomatis uang kas masuk toko
    if (metode_bayar === 'tunai' && payAmount > 0) {
      const dateCode = tanggal.replace(/-/g, '');
      const [maxKas] = await connection.query('SELECT MAX(id) as maxId FROM kas');
      const nextKasId = (maxKas[0]?.maxId || 0) + 1;
      const kode_kas = `KAS-IN-${dateCode}-${String(nextKasId).padStart(3, '0')}`;
      await connection.query(
        `INSERT INTO kas (
          kode_transaksi, tipe, kategori, jumlah, sumber, referensi_id, keterangan, tanggal
        ) VALUES (?, 'masuk', 'Pelunasan Kasbon', ?, 'bayar_hutang', ?, ?, ?)`,
        [
          kode_kas,
          payAmount,
          kode_bayar,
          `Pelunasan kasbon pelanggan ${cust.nama || 'Pelanggan'} (${kode_bayar})`,
          tanggal,
        ]
      );
    }

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
      `SELECT t.*, p.nama as nama_pelanggan, p.nama as pelanggan_nama, p.no_hp as no_hp_pelanggan 
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
    if (isNaN(amount) || amount <= 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Nominal transaksi wajib lebih dari 0!' });
    }

    const [custRows] = await connection.query(
      'SELECT * FROM pelanggan WHERE id = ? FOR UPDATE',
      [pelanggan_id]
    );
    if (custRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Pelanggan tidak ditemukan' });
    }

    const cust = custRows[0];
    const prevBalance = parseFloat(cust.saldo_titipan) || 0;

    if (jenis_transaksi === 'tarik' && prevBalance < amount) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: `Saldo tabungan titipan tidak mencukupi untuk ditarik! Sisa saldo saat ini: Rp ${prevBalance.toLocaleString('id-ID')}` 
      });
    }

    const newBalance = jenis_transaksi === 'setor' 
      ? Number((prevBalance + amount).toFixed(2)) 
      : Number(Math.max(0, prevBalance - amount).toFixed(2));

    await connection.query('UPDATE pelanggan SET saldo_titipan = ? WHERE id = ?', [newBalance, pelanggan_id]);

    const kode_titipan = req.body.kode_titipan || `TTP-${Date.now().toString().slice(-4)}`;
    const [result] = await connection.query(
      `INSERT INTO titipan (
        kode_titipan, pelanggan_id, jenis_transaksi, jumlah, 
        saldo_sebelum, saldo_sesudah, keterangan, tanggal
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [kode_titipan, pelanggan_id, jenis_transaksi, amount, prevBalance, newBalance, keterangan || null, tanggal]
    );

    // ====================================================================
    // SINKRONISASI KAS DI LACI FISIK TOKO:
    // - 'setor' : Uang tunai disetorkan nasabah masuk ke laci kasir (KAS MASUK)
    // - 'tarik' : Kasir mengeluarkan uang tunai dari laci kasir (KAS KELUAR)
    // ====================================================================
    const dateCode = (tanggal || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
    const kasTipe = jenis_transaksi === 'setor' ? 'masuk' : 'keluar';
    const kasKategori = jenis_transaksi === 'setor' ? 'Setor Tabungan' : 'Tarik Tabungan';
    const prefix = kasTipe === 'masuk' ? 'KAS-IN' : 'KAS-OUT';

    const [maxKas] = await connection.query('SELECT MAX(id) as maxId FROM kas');
    const nextKasId = (maxKas[0]?.maxId || 0) + 1;
    const kode_kas = `${prefix}-${dateCode}-${String(nextKasId).padStart(3, '0')}`;

    const kasKet = keterangan 
      ? `${kasKategori} - ${cust.nama}: ${keterangan}` 
      : `${kasKategori} - ${cust.nama} (${kode_titipan})`;

    await connection.query(
      `INSERT INTO kas (
        kode_transaksi, tipe, kategori, jumlah, sumber, referensi_id, keterangan, tanggal
      ) VALUES (?, ?, ?, ?, 'titipan', ?, ?, ?)`,
      [kode_kas, kasTipe, kasKategori, amount, kode_titipan, kasKet, tanggal]
    );

    await connection.commit();

    const [newTitipan] = await db.query(
      'SELECT t.*, p.nama as nama_pelanggan, p.nama as pelanggan_nama, p.no_hp as no_hp_pelanggan FROM titipan t JOIN pelanggan p ON t.pelanggan_id = p.id WHERE t.id = ?',
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: `Transaksi ${jenis_transaksi === 'setor' ? 'setoran' : 'penarikan'} tabungan berhasil dicatat dan disinkronkan ke buku kas`,
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

// Endpoint untuk re-sinkronisasi & perbaikan saldo tabungan nasabah serta buku kas
app.post('/api/titipan/perbaiki-saldo', async (req, res) => {
  try {
    await repairTitipanAndKasSync();
    return res.json({
      success: true,
      message: 'Seluruh saldo tabungan mitra dan mutasi kas di laci berhasil diperbaiki & disinkronkan!',
    });
  } catch (error) {
    console.error('POST /api/titipan/perbaiki-saldo error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ====================================================================
// 8. ENDPOINTS: UANG KAS TOKO (ARUS KAS MASUK & KELUAR)
// ====================================================================
app.get('/api/kas', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : '';
    const tipe = req.query.tipe ? req.query.tipe.trim() : '';
    const kategori = req.query.kategori ? req.query.kategori.trim() : '';
    const startDate = req.query.startDate ? req.query.startDate.trim() : '';
    const endDate = req.query.endDate ? req.query.endDate.trim() : '';
    const today = new Date().toISOString().slice(0, 10);

    let whereClause = ' WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (kode_transaksi LIKE ? OR kategori LIKE ? OR keterangan LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    if (tipe && (tipe === 'masuk' || tipe === 'keluar')) {
      whereClause += ' AND tipe = ?';
      params.push(tipe);
    }
    if (kategori) {
      whereClause += ' AND kategori = ?';
      params.push(kategori);
    }
    if (startDate) {
      whereClause += ' AND tanggal >= ?';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND tanggal <= ?';
      params.push(endDate);
    }

    // Hitung total filtered rows
    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM kas ${whereClause}`,
      params
    );
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit) || 1;

    // Ambil data dengan pagination
    const [rows] = await db.query(
      `SELECT * FROM kas ${whereClause} ORDER BY tanggal DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Hitung saldo kas riil keseluruhan toko (Total Masuk - Total Keluar)
    const [allSummary] = await db.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN tipe = 'masuk' THEN jumlah ELSE 0 END), 0) as total_masuk,
        COALESCE(SUM(CASE WHEN tipe = 'keluar' THEN jumlah ELSE 0 END), 0) as total_keluar
      FROM kas
    `);
    const totalMasukAll = parseFloat(allSummary[0].total_masuk) || 0;
    const totalKeluarAll = parseFloat(allSummary[0].total_keluar) || 0;
    const saldoKasSaatIni = totalMasukAll - totalKeluarAll;

    // Hitung perputaran kas hari ini
    const [todaySummary] = await db.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN tipe = 'masuk' THEN jumlah ELSE 0 END), 0) as masuk,
        COALESCE(SUM(CASE WHEN tipe = 'keluar' THEN jumlah ELSE 0 END), 0) as keluar
      FROM kas WHERE tanggal = ?`,
      [today]
    );
    const hariIniMasuk = parseFloat(todaySummary[0].masuk) || 0;
    const hariIniKeluar = parseFloat(todaySummary[0].keluar) || 0;

    return res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      summary: {
        saldo_kas: saldoKasSaatIni,
        total_masuk: totalMasukAll,
        total_keluar: totalKeluarAll,
        kas_hari_ini: {
          masuk: hariIniMasuk,
          keluar: hariIniKeluar,
          selisih: hariIniMasuk - hariIniKeluar,
        },
      },
    });
  } catch (error) {
    console.error('GET /api/kas error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/kas', async (req, res) => {
  try {
    const {
      tipe, // 'masuk' | 'keluar'
      kategori,
      jumlah,
      keterangan = '',
      tanggal = new Date().toISOString().slice(0, 10),
    } = req.body;

    if (!tipe || !['masuk', 'keluar'].includes(tipe)) {
      return res.status(400).json({ success: false, message: 'Tipe kas (masuk atau keluar) wajib dipilih!' });
    }
    if (!kategori || !kategori.trim()) {
      return res.status(400).json({ success: false, message: 'Kategori kas wajib diisi!' });
    }
    const nominal = parseFloat(jumlah);
    if (isNaN(nominal) || nominal <= 0) {
      return res.status(400).json({ success: false, message: 'Jumlah kas wajib lebih dari 0!' });
    }

    // Generate kode transaksi kas
    const dateCode = tanggal.replace(/-/g, '');
    const prefix = tipe === 'masuk' ? 'KAS-IN' : 'KAS-OUT';
    const [maxRow] = await db.query('SELECT MAX(id) as maxId FROM kas');
    const nextId = (maxRow[0].maxId || 0) + 1;
    const kode_transaksi = `${prefix}-${dateCode}-${String(nextId).padStart(3, '0')}`;

    const [result] = await db.query(
      `INSERT INTO kas (
        kode_transaksi, tipe, kategori, jumlah, sumber, keterangan, tanggal
      ) VALUES (?, ?, ?, ?, 'manual', ?, ?)`,
      [kode_transaksi, tipe, kategori.trim(), nominal, keterangan.trim() || null, tanggal]
    );

    const [newRow] = await db.query('SELECT * FROM kas WHERE id = ?', [result.insertId]);

    return res.status(201).json({
      success: true,
      message: `Catatan kas ${tipe} berhasil disimpan`,
      data: newRow[0],
    });
  } catch (error) {
    console.error('POST /api/kas error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/kas/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { kategori, jumlah, keterangan = '', tanggal } = req.body;

    const [exist] = await db.query('SELECT * FROM kas WHERE id = ?', [id]);
    if (exist.length === 0) {
      return res.status(404).json({ success: false, message: 'Transaksi kas tidak ditemukan' });
    }

    const updates = [];
    const params = [];

    if (kategori) {
      updates.push('kategori = ?');
      params.push(kategori.trim());
    }
    if (jumlah !== undefined) {
      const nominal = parseFloat(jumlah);
      if (isNaN(nominal) || nominal <= 0) {
        return res.status(400).json({ success: false, message: 'Jumlah wajib lebih dari 0!' });
      }
      updates.push('jumlah = ?');
      params.push(nominal);
    }
    if (keterangan !== undefined) {
      updates.push('keterangan = ?');
      params.push(keterangan.trim() || null);
    }
    if (tanggal) {
      updates.push('tanggal = ?');
      params.push(tanggal);
    }

    if (updates.length > 0) {
      params.push(id);
      await db.query(`UPDATE kas SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    const [updated] = await db.query('SELECT * FROM kas WHERE id = ?', [id]);
    return res.json({
      success: true,
      message: 'Transaksi kas berhasil diperbarui',
      data: updated[0],
    });
  } catch (error) {
    console.error('PUT /api/kas/:id error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/kas/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [exist] = await db.query('SELECT * FROM kas WHERE id = ?', [id]);
    if (exist.length === 0) {
      return res.status(404).json({ success: false, message: 'Transaksi kas tidak ditemukan' });
    }
    await db.query('DELETE FROM kas WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Transaksi kas berhasil dihapus' });
  } catch (error) {
    console.error('DELETE /api/kas/:id error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ====================================================================
// 9. ENDPOINTS: LAPORAN & GRAFIK ANALITIK
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
    let filterJualTj = '';
    const unionBeliParams = [dateFormat];
    const unionJualParams = [dateFormat];
    const beliParams = [];
    const jualParams = [];
    const jualDetailParams = [];

    if (startDate) {
      filterBeli += ' AND tanggal >= ?';
      filterJual += ' AND tanggal >= ?';
      filterJualTj += ' AND tj.tanggal >= ?';
      unionBeliParams.push(startDate);
      unionJualParams.push(startDate);
      beliParams.push(startDate);
      jualParams.push(startDate);
      jualDetailParams.push(startDate);
    }
    if (endDate) {
      filterBeli += ' AND tanggal <= ?';
      filterJual += ' AND tanggal <= ?';
      filterJualTj += ' AND tj.tanggal <= ?';
      unionBeliParams.push(endDate);
      unionJualParams.push(endDate);
      beliParams.push(endDate);
      jualParams.push(endDate);
      jualDetailParams.push(endDate);
    }
    beliParams.unshift(dateFormat);
    beliParams.push(dateFormat);
    jualParams.unshift(dateFormat);
    jualParams.push(dateFormat);
    jualDetailParams.unshift(dateFormat);
    jualDetailParams.push(dateFormat);

    const query = `
      SELECT 
        period_data.label,
        COALESCE(beli.total_beli, 0) as beli,
        COALESCE(jual.total_jual, 0) as jual,
        COALESCE(beli.emas_gr, 0) as emas_gr,
        COALESCE(beli.sawit_kg, 0) as sawit_kg,
        COALESCE(beli.karet_kg, 0) as karet_kg,
        COALESCE(jual_detail.total_qty_jual, 0) as total_qty_jual,
        COALESCE(jual_detail.jual_emas_gr, 0) as jual_emas_gr,
        COALESCE(jual_detail.jual_sawit_kg, 0) as jual_sawit_kg,
        COALESCE(jual_detail.jual_karet_kg, 0) as jual_karet_kg
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
      LEFT JOIN (
        SELECT 
          DATE_FORMAT(tj.tanggal, ?) as label,
          SUM(tjd.qty) as total_qty_jual,
          SUM(CASE WHEN tjd.kode_produk = 'KMD-EMAS' OR LOWER(tjd.nama_produk) LIKE '%emas%' THEN tjd.qty ELSE 0 END) as jual_emas_gr,
          SUM(CASE WHEN tjd.kode_produk = 'KMD-SAWIT' OR LOWER(tjd.nama_produk) LIKE '%sawit%' THEN tjd.qty ELSE 0 END) as jual_sawit_kg,
          SUM(CASE WHEN tjd.kode_produk = 'KMD-KARET' OR LOWER(tjd.nama_produk) LIKE '%karet%' THEN tjd.qty ELSE 0 END) as jual_karet_kg
        FROM transaksi_jual tj
        JOIN transaksi_jual_detail tjd ON tj.id = tjd.transaksi_jual_id
        WHERE 1=1 ${filterJualTj}
        GROUP BY DATE_FORMAT(tj.tanggal, ?)
      ) jual_detail ON period_data.label = jual_detail.label
      ORDER BY period_data.label DESC
      LIMIT 100
    `;

    const allParams = [
      ...unionBeliParams,
      ...unionJualParams,
      ...beliParams,
      ...jualParams,
      ...jualDetailParams,
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

// Inisialisasi otomatis 3 produk komoditas tetap (KMD-EMAS, KMD-SAWIT, KMD-KARET)
async function ensureCommodityProducts() {
  try {
    const commodities = [
      { kode: 'KMD-EMAS', jenis: 'emas', nama: 'Emas Murni / Leburan', kategori: 'Perhiasan Emas', satuan: 'gram', defPrice: 1350000 },
      { kode: 'KMD-SAWIT', jenis: 'sawit', nama: 'Kelapa Sawit (TBS)', kategori: 'Pertanian', satuan: 'kg', defPrice: 2650 },
      { kode: 'KMD-KARET', jenis: 'karet', nama: 'Karet Rakyat', kategori: 'Pertanian', satuan: 'kg', defPrice: 11500 },
    ];

    for (const c of commodities) {
      const [exists] = await db.query('SELECT id, stok FROM produk WHERE kode = ?', [c.kode]);
      if (exists.length === 0) {
        // Hitung total berat bersih yang pernah dibeli
        const [sumBeli] = await db.query(
          'SELECT COALESCE(SUM(berat_bersih), 0) as total FROM transaksi_beli WHERE jenis_komoditas = ?',
          [c.jenis]
        );
        const totalStok = parseFloat(sumBeli[0].total) || 0;

        await db.query(
          `INSERT INTO produk (kode, nama, kategori, satuan, harga_beli, harga_jual, stok, deskripsi)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            c.kode,
            c.nama,
            c.kategori,
            c.satuan,
            c.defPrice,
            c.defPrice,
            totalStok,
            `Produk otomatis untuk komoditas ${c.nama}. Stok otomatis bertambah saat timbang beli komoditas.`,
          ]
        );
        console.log(`[Auto-Init] Produk ${c.kode} dibuat dengan stok sinkronisasi awal: ${totalStok} ${c.satuan}`);
      }
    }
  } catch (err) {
    // Database connection or table might not be ready yet
  }
}

// Inisialisasi tabel kas jika belum ada & migrasi kolom sumber
async function ensureKasTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS kas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        kode_transaksi VARCHAR(30) NOT NULL UNIQUE,
        tipe ENUM('masuk', 'keluar') NOT NULL,
        kategori VARCHAR(60) NOT NULL,
        jumlah DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
        sumber ENUM('manual', 'kasir', 'komoditas', 'bayar_hutang', 'titipan') DEFAULT 'manual',
        referensi_id VARCHAR(50) DEFAULT NULL,
        keterangan TEXT DEFAULT NULL,
        tanggal DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_kas_tipe (tipe),
        INDEX idx_kas_tgl (tanggal),
        INDEX idx_kas_kode (kode_transaksi)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Pastikan ENUM sumber memiliki 'titipan' jika tabel sudah ada sebelumnya
    try {
      await db.query(
        "ALTER TABLE kas MODIFY COLUMN sumber ENUM('manual', 'kasir', 'komoditas', 'bayar_hutang', 'titipan') DEFAULT 'manual'"
      );
    } catch {
      // Abaikan jika kolom sudah sesuai
    }
  } catch (err) {
    // Silent catch if DB not ready
  }
}

// Fungsi perbaikan saldo tabungan titipan dan sinkronisasi ke buku kas toko
async function repairTitipanAndKasSync() {
  let connection;
  try {
    connection = await db.getConnection();

    // 1. Dapatkan semua nasabah yang memiliki riwayat titipan
    const [custRows] = await connection.query(`
      SELECT DISTINCT pelanggan_id FROM titipan ORDER BY pelanggan_id ASC
    `);

    for (const { pelanggan_id } of custRows) {
      // Ambil seluruh mutasi tabungan nasabah ini secara kronologis (id ASC)
      const [transRows] = await connection.query(
        'SELECT * FROM titipan WHERE pelanggan_id = ? ORDER BY id ASC',
        [pelanggan_id]
      );

      if (transRows.length === 0) continue;

      let runningBalance = parseFloat(transRows[0].saldo_sebelum) || 0;

      for (const t of transRows) {
        const amt = parseFloat(t.jumlah) || 0;
        const before = runningBalance;
        let after = before;

        if (t.jenis_transaksi === 'setor' || t.jenis_transaksi === 'masuk_dari_jual_komoditas') {
          after = Number((before + amt).toFixed(2));
        } else if (
          t.jenis_transaksi === 'tarik' || 
          t.jenis_transaksi === 'potong_bayar_belanja' || 
          t.jenis_transaksi === 'potong_bayar_hutang'
        ) {
          after = Number(Math.max(0, before - amt).toFixed(2));
        }

        const currBefore = parseFloat(t.saldo_sebelum) || 0;
        const currAfter = parseFloat(t.saldo_sesudah) || 0;

        if (currBefore !== before || currAfter !== after) {
          await connection.query(
            'UPDATE titipan SET saldo_sebelum = ?, saldo_sesudah = ? WHERE id = ?',
            [before, after, t.id]
          );
        }

        runningBalance = after;
      }

      // Update saldo akhir di master pelanggan
      await connection.query(
        'UPDATE pelanggan SET saldo_titipan = ? WHERE id = ?',
        [runningBalance, pelanggan_id]
      );
    }

    // 2. Sinkronkan riwayat setor & tarik tabungan ke dalam buku kas jika belum tercatat
    const [allTitipan] = await connection.query(`
      SELECT t.*, p.nama as nama_pelanggan 
      FROM titipan t 
      JOIN pelanggan p ON t.pelanggan_id = p.id 
      WHERE t.jenis_transaksi IN ('setor', 'tarik')
      ORDER BY t.id ASC
    `);

    for (const t of allTitipan) {
      const [existKas] = await connection.query(
        'SELECT id FROM kas WHERE referensi_id = ? OR keterangan LIKE ?',
        [t.kode_titipan, `%${t.kode_titipan}%`]
      );

      if (existKas.length === 0) {
        const kasTipe = t.jenis_transaksi === 'setor' ? 'masuk' : 'keluar';
        const kasKategori = t.jenis_transaksi === 'setor' ? 'Setor Tabungan' : 'Tarik Tabungan';
        const prefix = kasTipe === 'masuk' ? 'KAS-IN' : 'KAS-OUT';
        const rawDate = t.tanggal ? new Date(t.tanggal).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
        const dateCode = rawDate.replace(/-/g, '');
        const kode_kas = `${prefix}-SYNC-${dateCode}-${t.id}`;

        const kasKet = t.keterangan 
          ? `${kasKategori} - ${t.nama_pelanggan}: ${t.keterangan}` 
          : `${kasKategori} - ${t.nama_pelanggan} (${t.kode_titipan})`;

        await connection.query(
          `INSERT INTO kas (
            kode_transaksi, tipe, kategori, jumlah, sumber, referensi_id, keterangan, tanggal
          ) VALUES (?, ?, ?, ?, 'titipan', ?, ?, ?)`,
          [
            kode_kas,
            kasTipe,
            kasKategori,
            parseFloat(t.jumlah) || 0,
            t.kode_titipan,
            kasKet,
            rawDate
          ]
        );
      }
    }
    console.log('[Auto-Sync] Saldo tabungan mitra dan mutasi kas di laci berhasil diperiksa & disinkronkan.');
  } catch (err) {
    console.error('[Auto-Sync] Gagal menjalankan repairTitipanAndKasSync:', err.message);
  } finally {
    if (connection) connection.release();
  }
}

// Start Server
app.listen(PORT, async () => {
  console.log(`🚀 Berkah POS Backend berjalan di port http://localhost:${PORT}`);
  await ensureKasTable();
  await ensureCommodityProducts();
  await repairTitipanAndKasSync();
});
