import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  QrCode,
  Wallet,
  RotateCcw,
  CheckCircle2,
  Package,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import { formatRupiah, getImageUrl } from '@/utils/formatters';
import ReceiptModal from '@/components/common/ReceiptModal';
import EmptyState from '@/components/common/EmptyState';

export default function Kasir() {
  const { storeInfo } = useOutletContext();

  // Mobile view tab: 'catalog' | 'cart'
  const [mobileTab, setMobileTab] = useState('catalog');

  // Products state
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Customers state
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Cart state
  const [cart, setCart] = useState([]);
  const [diskon, setDiskon] = useState(0);

  // Checkout payment state
  const [metodeBayar, setMetodeBayar] = useState('tunai');
  const [nominalBayar, setNominalBayar] = useState('');
  const [catatan, setCatatan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Receipt Modal state
  const [completedReceipt, setCompletedReceipt] = useState(null);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await request.get(API_ENDPOINTS.PRODUK.LIST, { limit: 100 });
      if (res?.success) {
        const prods = res.data || [];
        setProducts(prods);
        const cats = Array.from(new Set(prods.map((p) => p.kategori).filter(Boolean)));
        setCategories(cats);
      }
    } catch {
      toast.error('Gagal mengambil katalog produk');
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await request.get(API_ENDPOINTS.PELANGGAN.LIST, { limit: 100 });
      if (res?.success) {
        setCustomers(res.data || []);
      }
    } catch (err) {
      console.error('Gagal mengambil data pelanggan:', err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, []);

  const handleSelectCustomer = (e) => {
    const cid = e.target.value;
    setSelectedCustomerId(cid);
    if (!cid) {
      setSelectedCustomer(null);
      if (metodeBayar === 'hutang' || metodeBayar === 'saldo_titipan') {
        setMetodeBayar('tunai');
      }
    } else {
      const found = customers.find((c) => String(c.id) === String(cid));
      setSelectedCustomer(found || null);
    }
  };

  const addToCart = (product) => {
    if (product.stok <= 0) {
      toast.error('Stok produk ini habis!');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.qty + 1 > product.stok) {
          toast.error(`Maksimal stok tersedia hanya ${product.stok}`);
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          kode: product.kode,
          nama: product.nama,
          harga_jual: Number(product.harga_jual),
          satuan: product.satuan,
          stok: Number(product.stok),
          qty: 1,
        },
      ];
    });
  };

  const updateCartQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const currentQty = parseFloat(item.qty) || 0;
            const step = item.satuan === 'gram' || item.satuan === 'gr' ? 1 : 1;
            const nextQty = Math.round((currentQty + delta * step) * 1000) / 1000;
            if (nextQty > item.stok) {
              toast.error(`Maksimal stok tersedia hanya ${item.stok}`);
              return item;
            }
            return { ...item, qty: nextQty };
          }
          return item;
        })
        .filter((item) => (parseFloat(item.qty) || 0) > 0)
    );
  };

  const setCartQty = (id, val) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          if (val === '') return { ...item, qty: '' };
          const num = parseFloat(val);
          if (isNaN(num) || num < 0) return item;
          if (num > item.stok) {
            toast.error(`Maksimal stok tersedia hanya ${item.stok}`);
            return { ...item, qty: item.stok };
          }
          return { ...item, qty: val };
        }
        return item;
      })
    );
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setDiskon(0);
    setNominalBayar('');
    setCatatan('');
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + item.harga_jual * (parseFloat(item.qty) || 0),
    0
  );
  const totalAkhir = Math.max(0, subtotal - Number(diskon || 0));

  useEffect(() => {
    if (metodeBayar === 'tunai' && nominalBayar === '') {
      setNominalBayar(String(totalAkhir));
    }
  }, [totalAkhir, metodeBayar]);

  const bayarAmount =
    metodeBayar === 'tunai'
      ? Number(nominalBayar) || 0
      : totalAkhir;
  const kembali = Math.max(0, bayarAmount - totalAkhir);

  const filteredProducts = products.filter((p) => {
    const matchCat = !selectedCategory || p.kategori === selectedCategory;
    const matchSearch =
      !searchProduct ||
      p.nama.toLowerCase().includes(searchProduct.toLowerCase()) ||
      p.kode.toLowerCase().includes(searchProduct.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Keranjang belanja masih kosong!');
      return;
    }

    if (metodeBayar === 'tunai' && bayarAmount < totalAkhir) {
      toast.error('Nominal uang bayar kurang dari total transaksi!');
      return;
    }

    if (metodeBayar === 'hutang' && !selectedCustomer) {
      toast.error('Wajib memilih pelanggan terdaftar untuk metode Hutang/Kasbon!');
      return;
    }

    if (metodeBayar === 'saldo_titipan') {
      if (!selectedCustomer) {
        toast.error('Wajib memilih pelanggan untuk potong Saldo Titipan!');
        return;
      }
      if (Number(selectedCustomer.saldo_titipan) < totalAkhir) {
        toast.error(
          `Saldo titipan pelanggan (${formatRupiah(
            selectedCustomer.saldo_titipan
          )}) tidak mencukupi!`
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        pelanggan_id: selectedCustomer ? selectedCustomer.id : null,
        nama_pelanggan: selectedCustomer ? selectedCustomer.nama : 'Pelanggan Umum',
        subtotal,
        diskon: Number(diskon) || 0,
        pajak: 0,
        total_akhir: totalAkhir,
        bayar: bayarAmount,
        kembali,
        metode_bayar: metodeBayar,
        status_bayar: metodeBayar === 'hutang' ? 'belum_lunas' : 'lunas',
        kasir: 'Kasir Utama',
        catatan,
        tanggal: new Date().toISOString().split('T')[0],
        items: cart.map((c) => ({
          produk_id: c.id,
          kode_produk: c.kode,
          nama_produk: c.nama,
          qty: parseFloat(c.qty) || 1,
          satuan: c.satuan,
          harga_satuan: c.harga_jual,
          subtotal: c.harga_jual * (parseFloat(c.qty) || 1),
        })),
      };

      const res = await request.post(API_ENDPOINTS.TRANSAKSI_JUAL.CREATE, payload);
      if (res?.success) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });

        toast.success('Transaksi kasir berhasil disimpan!');

        setCompletedReceipt({
          ...payload,
          no_faktur: res.data?.no_faktur || 'INV-Baru',
          created_at: new Date().toISOString(),
        });

        clearCart();
        setMobileTab('catalog');
        fetchProducts();
        fetchCustomers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan transaksi kasir');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
            Kasir POS Penjualan Toko
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan penjualan kasir, katalog produk, kalkulator uang kembali, dan cetak struk.
          </p>
        </div>

        {cart.length > 0 && (
          <button
            type="button"
            onClick={clearCart}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold self-start sm:self-auto transition-colors shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Keranjang
          </button>
        )}
      </div>

      {/* Mobile Tab Switcher (Katalog vs Keranjang) */}
      <div className="flex lg:hidden rounded-2xl bg-white border border-slate-200 p-1 shadow-2xs">
        <button
          type="button"
          onClick={() => setMobileTab('catalog')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'catalog'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Katalog Produk</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('cart')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'cart'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Keranjang ({cart.length})</span>
        </button>
      </div>

      {/* POS Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (Catalog) */}
        <div className={`lg:col-span-7 space-y-4 ${mobileTab === 'catalog' ? 'block' : 'hidden lg:block'}`}>
          {/* Search & Category Pills */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                placeholder="Cari nama produk atau kode..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Categories scrollable horizontally */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedCategory('')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                  !selectedCategory
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Semua
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          {loadingProducts ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 rounded-2xl bg-white border border-slate-200/90 animate-pulse shadow-sm" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
              <EmptyState
                title="Produk Tidak Ditemukan"
                description="Tidak ada produk yang cocok dengan pencarian."
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 max-h-[calc(100vh-20rem)] overflow-y-auto pr-1">
              {filteredProducts.map((p) => {
                const inCart = cart.find((item) => item.id === p.id);
                const isOutOfStock = p.stok <= 0;

                return (
                  <div
                    key={p.id}
                    onClick={() => !isOutOfStock && addToCart(p)}
                    className={`p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group shadow-2xs ${
                      isOutOfStock
                        ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                        : inCart
                        ? 'bg-emerald-50/50 border-emerald-500/80 shadow-sm'
                        : 'bg-white border-slate-200/90 hover:border-emerald-500/60 hover:shadow-sm'
                    }`}
                  >
                    <div>
                      {/* Product Image */}
                      <div className="w-full h-20 sm:h-24 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden mb-2 relative">
                        {p.foto ? (
                          <img
                            src={getImageUrl(p.foto)}
                            alt={p.nama}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <Package className="w-7 h-7 text-slate-300" />
                        )}

                        {inCart && (
                          <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-md bg-emerald-600 text-white font-bold text-[9px] shadow-sm">
                            {inCart.qty}x
                          </div>
                        )}
                      </div>

                      <div className="text-[9px] font-mono-num text-slate-400 uppercase">
                        {p.kode}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug mt-0.5">
                        {p.nama}
                      </h4>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div className="min-w-0 pr-1">
                        <div className="text-xs font-black text-emerald-700 font-mono-num truncate">
                          {formatRupiah(p.harga_jual)}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          Stok: {p.stok} {p.satuan}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isOutOfStock}
                        className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white transition-all disabled:opacity-30 flex-shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column (Cart & Checkout Panel) */}
        <div className={`lg:col-span-5 flex flex-col space-y-4 ${mobileTab === 'cart' ? 'block' : 'hidden lg:block'}`}>
          <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4 flex-1 flex flex-col justify-between">
            <div>
              {/* Customer Selector */}
              <div className="space-y-1.5 mb-3.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Pilih Pelanggan / Mitra
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={handleSelectCustomer}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Pelanggan Umum (Cash) --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.kode} - {c.nama} ({c.kategori})
                    </option>
                  ))}
                </select>

                {selectedCustomer && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] flex justify-between">
                    <div>
                      <span className="text-slate-500">Kasbon: </span>
                      <span className="font-bold text-rose-600 font-mono-num">
                        {formatRupiah(selectedCustomer.saldo_hutang)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Tabungan: </span>
                      <span className="font-bold text-blue-600 font-mono-num">
                        {formatRupiah(selectedCustomer.saldo_titipan)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Cart Items List */}
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex justify-between items-center">
                <span>Keranjang Belanja</span>
                <span className="text-slate-400 font-normal">
                  {cart.length} item
                </span>
              </div>

              <div className="space-y-2 max-h-48 sm:max-h-56 overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="py-6 sm:py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                    Keranjang kosong. Klik produk di sebelah kiri untuk menambahkan.
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900 truncate">{item.nama}</div>
                        <div className="text-[10px] text-slate-500 font-mono-num">
                          {formatRupiah(item.harga_jual)} / {item.satuan}
                        </div>
                      </div>

                      {/* Qty Controls with direct decimal input */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.id, -1)}
                          className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          step={item.satuan === 'gram' || item.satuan === 'gr' ? '0.001' : '1'}
                          min="0.001"
                          value={item.qty}
                          onChange={(e) => setCartQty(item.id, e.target.value)}
                          className="w-16 px-1 py-0.5 text-center font-bold text-slate-900 font-mono-num text-xs bg-white border border-slate-200 rounded-md focus:border-emerald-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.id, 1)}
                          className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Item Subtotal */}
                      <div className="w-20 text-right font-black text-emerald-700 font-mono-num text-xs">
                        {formatRupiah(item.harga_jual * (parseFloat(item.qty) || 0))}
                      </div>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Calculations & Payment Methods */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              {/* Subtotal & Diskon */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-mono-num font-semibold text-slate-800">
                    {formatRupiah(subtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Diskon Potongan (Rp)</span>
                  <input
                    type="number"
                    min="0"
                    value={diskon}
                    onChange={(e) => setDiskon(e.target.value)}
                    className="w-24 sm:w-28 px-2 py-1 bg-white border border-slate-200 rounded-lg text-right font-mono-num text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-slate-100">
                  <span className="text-xs sm:text-sm font-bold text-slate-900">TOTAL AKHIR</span>
                  <span className="text-lg sm:text-xl font-black text-emerald-700 font-mono-num">
                    {formatRupiah(totalAkhir)}
                  </span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {[
                    { id: 'tunai', label: 'Tunai', icon: Banknote },
                    { id: 'transfer', label: 'Transfer', icon: CreditCard },
                    { id: 'qris', label: 'QRIS', icon: QrCode },
                    { id: 'hutang', label: 'Kasbon', icon: CreditCard },
                    { id: 'saldo_titipan', label: 'Tabungan', icon: Wallet },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMetodeBayar(m.id)}
                        className={`p-1.5 sm:p-2 rounded-xl border text-[10px] sm:text-[11px] font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all ${
                          metodeBayar === m.id
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="truncate">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cash payment inputs & quick denominations */}
              {metodeBayar === 'tunai' && (
                <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Nominal Diterima:</span>
                    <input
                      type="number"
                      value={nominalBayar}
                      onChange={(e) => setNominalBayar(e.target.value)}
                      className="w-32 sm:w-36 px-2 py-1 bg-white border border-slate-300 rounded-lg text-right font-mono-num text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Quick Cash Buttons */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setNominalBayar(String(totalAkhir))}
                      className="px-2 py-1 rounded bg-white border border-slate-200 text-[10px] text-slate-700 font-semibold hover:bg-slate-100 shadow-2xs"
                    >
                      Uang Pas
                    </button>
                    {[50000, 100000, 200000, 500000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setNominalBayar(String(val))}
                        className="px-2 py-1 rounded bg-white border border-slate-200 text-[10px] text-slate-700 font-semibold hover:bg-slate-100 shadow-2xs"
                      >
                        {formatRupiah(val)}
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200">
                    <span className="text-slate-600">Kembalian:</span>
                    <span
                      className={`font-mono-num font-bold ${
                        kembali >= 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {formatRupiah(kembali)}
                    </span>
                  </div>
                </div>
              )}

              {metodeBayar === 'hutang' && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-tight">
                  Dicatat sebagai bon kasbon atas nama{' '}
                  <strong className="text-slate-900 font-bold">
                    {selectedCustomer?.nama || 'Pelanggan'}
                  </strong>.
                </div>
              )}

              {metodeBayar === 'saldo_titipan' && (
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 leading-tight">
                  Saldo tabungan mitra terpotong{' '}
                  <strong className="text-slate-900 font-bold">{formatRupiah(totalAkhir)}</strong>.
                </div>
              )}

              {/* Checkout Submit Button */}
              <button
                type="button"
                disabled={submitting || cart.length === 0}
                onClick={handleCheckout}
                className="w-full py-2.5 sm:py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Bayar Sekarang ({formatRupiah(totalAkhir)})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Bar on Mobile when on Catalog and Cart has items */}
      {mobileTab === 'catalog' && cart.length > 0 && (
        <div className="fixed bottom-3 left-3 right-3 lg:hidden z-40 bg-emerald-900 text-white p-3 rounded-2xl shadow-xl flex items-center justify-between animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-800 flex items-center justify-center font-bold text-xs font-mono-num flex-shrink-0">
              {cart.length}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-emerald-300 font-medium truncate">Total Belanja:</div>
              <div className="text-xs font-black font-mono-num truncate">{formatRupiah(totalAkhir)}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileTab('cart')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-emerald-900 font-extrabold text-xs shadow hover:bg-emerald-50 transition-colors flex-shrink-0"
          >
            <span>Buka Keranjang</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Thermal Receipt Print Modal */}
      <ReceiptModal
        isOpen={Boolean(completedReceipt)}
        onClose={() => setCompletedReceipt(null)}
        data={completedReceipt}
        type="pos"
        storeInfo={storeInfo}
      />
    </div>
  );
}
