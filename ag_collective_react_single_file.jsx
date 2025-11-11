// AG Collective — Single-file React app
// Features added: Owner dashboard with uploads & stock, 100 products, cart, sign-up/login (localStorage), "Remember me forever",
// Confirm flow: creates account if needed, or goes to payment choice (Cash or Razorpay simulated).

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

// --- Helpers for localStorage user management ---
const USERS_KEY = 'ag_users_v1';
const CURRENT_KEY = 'ag_current_user_v1';
const REMEMBER_KEY = 'ag_remember_me_v1';

function readUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  } catch {
    return [];
  }
}
function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
function setCurrentUser(user, remember) {
  if (remember) localStorage.setItem(CURRENT_KEY, JSON.stringify(user));
  else localStorage.removeItem(CURRENT_KEY);
  if (remember) localStorage.setItem(REMEMBER_KEY, '1');
  else localStorage.removeItem(REMEMBER_KEY);
}
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(CURRENT_KEY) || 'null');
  } catch {
    return null;
  }
}
function isRemembered() {
  return !!localStorage.getItem(REMEMBER_KEY);
}

// --- Sample product generator ---
const initialProducts = Array.from({ length: 100 }, (_, i) => ({
  id: i + 1,
  name: `Regal Piece ${String(i + 1).padStart(3, '0')}`,
  description: 'none',
  price: (Math.floor(Math.random() * 5000) + 500).toString(),
  stock: Math.floor(Math.random() * 10) + 1,
  image: 'https://via.placeholder.com/400x400.png?text=Jewelry',
}));

export default function AGCollective() {
  // products and cart
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('ag_products_v1');
    return saved ? JSON.parse(saved) : initialProducts;
  });
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('ag_cart_v1') || '[]');
    } catch {
      return [];
    }
  });

  // page view state
  const [view, setView] = useState('home'); // home | shop | cart | owner | checkout | auth

  // auth
  const [currentUser, setCurrentUserState] = useState(getCurrentUser());
  const [authModal, setAuthModal] = useState(false); // shows signup/login modal
  const [authMode, setAuthMode] = useState('signup'); // signup | login
  const [rememberMe, setRememberMe] = useState(isRemembered());

  // owner auth
  const [ownerPw, setOwnerPw] = useState('');
  const [ownerAuth, setOwnerAuth] = useState(false);

  // signup/login form
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', password: '' });

  // payment simulation
  const [orderPreview, setOrderPreview] = useState(null); // {items, total}
  const [paymentMethod, setPaymentMethod] = useState(null); // 'cash' | 'razorpay'

  // persist products
  useEffect(() => {
    localStorage.setItem('ag_products_v1', JSON.stringify(products));
  }, [products]);

  // persist cart in session so refreshing doesn't lose it (but not permanent)
  useEffect(() => {
    sessionStorage.setItem('ag_cart_v1', JSON.stringify(cart));
  }, [cart]);

  // helper - add to cart (checks stock)
  const addToCart = (prod) => {
    const p = products.find((x) => x.id === prod.id);
    if (!p || p.stock <= 0) return; // out
    // decrease stock
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, stock: x.stock - 1 } : x)));
    setCart((prev) => [...prev, { ...p }]);
  };

  const removeFromCart = (index) => {
    const item = cart[index];
    setCart((prev) => prev.filter((_, i) => i !== index));
    // restore stock
    setProducts((prev) => prev.map((x) => (x.id === item.id ? { ...x, stock: x.stock + 1 } : x)));
  };

  const clearCart = () => {
    // restore stock for all
    cart.forEach((it) => {
      setProducts((prev) => prev.map((x) => (x.id === it.id ? { ...x, stock: x.stock + 1 } : x)));
    });
    setCart([]);
  };

  // Auth flows: signup and login
  const handleSignup = (e) => {
    e.preventDefault();
    const users = readUsers();
    if (users.find((u) => u.email === form.email)) {
      alert('An account with this email already exists.');
      return;
    }
    const newUser = { id: Date.now(), ...form };
    users.push(newUser);
    writeUsers(users);
    setCurrentUser(newUser, rememberMe);
    setCurrentUserState(newUser);
    setAuthModal(false);
    alert('Account created — you are now logged in.');
    // proceed to checkout if coming from confirm
    if (view === 'confirm-wait') setView('checkout');
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const users = readUsers();
    const u = users.find((x) => x.email === form.email && x.password === form.password);
    if (!u) {
      alert('Invalid email or password');
      return;
    }
    setCurrentUser(u, rememberMe);
    setCurrentUserState(u);
    setAuthModal(false);
    alert('Logged in — welcome back!');
    if (view === 'confirm-wait') setView('checkout');
  };

  useEffect(() => {
    // on mount, if remembered user exists, set it
    const u = getCurrentUser();
    if (u) setCurrentUserState(u);
  }, []);

  // Owner auth
  const tryOwner = (e) => {
    e.preventDefault();
    if (ownerPw === 'GLJI') setOwnerAuth(true);
    else alert('Incorrect owner password');
  };

  // Owner product edits, image upload, stock and name/desc/price edits
  const editProductField = (id, field, value) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const addProduct = () => {
    const id = products.length + 1;
    const newP = { id, name: `New Piece ${id}`, description: 'none', price: '0', stock: 0, image: 'https://via.placeholder.com/400x400.png?text=New' };
    setProducts((prev) => [newP, ...prev]);
  };

  const uploadImage = (id, file) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      editProductField(id, 'image', ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Confirm flow: when user clicks Confirm in Cart
  const handleConfirm = () => {
    if (!currentUser) {
      // ask them to sign up / login before checkout
      setView('confirm-wait');
      setAuthMode('signup');
      setAuthModal(true);
      return;
    }
    // user logged in -> go to checkout
    setView('checkout');
  };

  // Payment simulation
  const computeTotal = () => cart.reduce((s, it) => s + parseInt(it.price || '0', 10), 0);

  const placeOrder = (method) => {
    setPaymentMethod(method);
    // simulate order creation
    const order = { id: Date.now(), user: currentUser, items: cart, total: computeTotal(), method, createdAt: new Date().toISOString() };
    // store orders locally (demo)
    const orders = JSON.parse(localStorage.getItem('ag_orders_v1') || '[]');
    orders.push(order);
    localStorage.setItem('ag_orders_v1', JSON.stringify(orders));
    alert(`Order placed! Method: ${method}. Total: ₹${order.total}`);
    clearCart();
    setView('home');
  };

  // small header banner for signup/login prompt on arrival
  const BannerAuth = () => (
    <div className="bg-ivory border-b px-6 py-3 flex items-center justify-between">
      <div className="text-sm">New? <button onClick={() => { setAuthMode('signup'); setAuthModal(true); }} className="text-gold underline">Make a new account!</button></div>
      <div className="text-sm">Already a customer? <button onClick={() => { setAuthMode('login'); setAuthModal(true); }} className="text-gold underline">Log in</button></div>
    </div>
  );

  // --- UI ---
  return (
    <div className="font-serif min-h-screen bg-gradient-to-b from-[#f9f6f2] to-[#efe7dd] text-[#2b2b2b]">
      <BannerAuth />

      <nav className="flex justify-between items-center px-8 py-5 bg-white/60 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#c9a24a] to-[#b2872f] flex items-center justify-center text-white font-bold">AG</div>
          <div className="text-xl font-bold">AG Collective</div>
        </div>
        <div className="flex gap-6">
          <button onClick={() => setView('home')}>Home</button>
          <button onClick={() => setView('shop')}>Shop</button>
          <button onClick={() => setView('cart')}>Cart ({cart.length})</button>
          <button onClick={() => setView('owner')}>Owner's</button>
        </div>
      </nav>

      {/* Main content views */}
      {view === 'home' && (
        <main className="p-10 text-center">
          <h1 className="text-5xl text-[#b2872f] font-serif">AG Collective</h1>
          <p className="mt-3 text-lg text-[#444]">The Beauty Of The Unusual — elegant, formal handmade jewelry.</p>
          <button onClick={() => setView('shop')} className="mt-6 px-6 py-3 bg-[#b2872f] text-white rounded-lg">Explore Collection</button>
        </main>
      )}

      {view === 'shop' && (
        <section className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {products.map((p) => (
            <motion.div key={p.id} whileHover={{ translateY: -6 }} className="bg-white rounded-xl p-4 shadow">
              <img src={p.image} alt={p.name} className="h-44 w-full object-cover rounded-md mb-3" />
              <div className="font-medium text-[#2b2b2b]">{p.name}</div>
              <div className="text-sm text-gray-600">{p.description}</div>
              <div className="mt-2 text-[#b2872f] font-semibold">₹{p.price}</div>
              <div className="text-xs text-gray-500">Stock: {p.stock}</div>
              <div className="mt-3 flex gap-2">
                <button disabled={p.stock === 0} onClick={() => addToCart(p)} className={`px-3 py-2 rounded ${p.stock === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#b2872f] text-white'}`}>
                  {p.stock === 0 ? 'Out of stock' : 'Add to cart'}
                </button>
                <button onClick={() => { /* quick view - prefill current product in cart flow? For simplicity open product page later */ }} className="px-3 py-2 border rounded">View</button>
              </div>
            </motion.div>
          ))}
        </section>
      )}

      {view === 'cart' && (
        <section className="p-6 max-w-4xl mx-auto">
          <h2 className="text-2xl mb-4">Your Cart</h2>
          {cart.length === 0 ? <p>Your cart is empty.</p> : (
            <div className="space-y-3">
              {cart.map((it, idx) => (
                <div key={idx} className="flex justify-between items-center border p-3 rounded">
                  <div>
                    <div className="font-medium">{it.name}</div>
                    <div className="text-sm text-gray-600">₹{it.price}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-gray-600">Qty 1</div>
                    <button onClick={() => removeFromCart(idx)} className="text-red-500">Remove</button>
                  </div>
                </div>
              ))}

              <div className="flex justify-between items-center mt-4">
                <div className="text-lg font-semibold">Total: ₹{computeTotal()}</div>
                <div className="flex gap-3">
                  <button onClick={() => setView('shop')} className="px-4 py-2 border rounded">Continue Shopping</button>
                  <button onClick={handleConfirm} className="px-4 py-2 bg-[#b2872f] text-white rounded">Confirm</button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {view === 'checkout' && (
        <section className="p-6 max-w-3xl mx-auto">
          <h2 className="text-2xl mb-4">Checkout</h2>
          <div className="bg-white p-4 rounded shadow">
            <div className="mb-4">Shipping to: <span className="font-medium">{currentUser?.name || '—'}</span></div>
            <div className="mb-6">Phone: <span className="font-medium">{currentUser?.phone || '—'}</span></div>

            <div className="mb-4">Choose payment:</div>
            <div className="flex gap-3">
              <button onClick={() => placeOrder('Cash on Delivery')} className="px-4 py-2 border rounded">Cash on Delivery</button>
              <button onClick={() => placeOrder('Razorpay (simulated)')} className="px-4 py-2 bg-[#b2872f] text-white rounded">Pay with Razorpay</button>
            </div>
          </div>
        </section>
      )}

      {view === 'owner' && (
        <section className="p-6">
          {!ownerAuth ? (
            <div className="max-w-md mx-auto bg-white p-6 rounded shadow text-center">
              <h3 className="text-xl mb-3">Owner's access</h3>
              <form onSubmit={tryOwner} className="flex gap-2 justify-center">
                <input placeholder="Owner password" value={ownerPw} onChange={(e) => setOwnerPw(e.target.value)} className="border p-2 rounded" />
                <button className="px-3 py-2 bg-[#b2872f] text-white rounded">Enter</button>
              </form>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl">Owner Dashboard</h3>
                <div>
                  <button onClick={addProduct} className="px-3 py-2 bg-[#b2872f] text-white rounded">+ Add Product</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {products.map((p) => (
                  <div key={p.id} className="bg-white p-3 rounded shadow">
                    <img src={p.image} alt={p.name} className="h-40 w-full object-cover rounded mb-2" />
                    <input value={p.name} onChange={(e) => editProductField(p.id, 'name', e.target.value)} className="w-full border-b mb-2" />
                    <textarea value={p.description} onChange={(e) => editProductField(p.id, 'description', e.target.value)} className="w-full border rounded p-1 mb-2" />
                    <div className="flex gap-2 mb-2">
                      <input type="number" value={p.stock} onChange={(e) => editProductField(p.id, 'stock', parseInt(e.target.value || '0'))} className="w-1/2 border p-1" />
                      <input value={p.price} onChange={(e) => editProductField(p.id, 'price', e.target.value)} className="w-1/2 border p-1" />
                    </div>
                    <input type="file" accept="image/*" onChange={(e) => uploadImage(p.id, e.target.files[0])} className="mb-2" />
                  </div>
                ))}
              </div>

            </div>
          )}
        </section>
      )}

      {/* Auth modal */}
      {authModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded max-w-md w-full">
            <div className="flex justify-between mb-4">
              <div className="text-xl">{authMode === 'signup' ? 'Create account' : 'Log in'}</div>
              <button onClick={() => setAuthModal(false)}>Close</button>
            </div>

            <form onSubmit={authMode === 'signup' ? handleSignup : handleLogin} className="space-y-3">
              {authMode === 'signup' && (
                <>
                  <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border p-2 rounded" />
                  <input required placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full border p-2 rounded" />
                  <input required placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border p-2 rounded" />
                </>
              )}

              <input required placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border p-2 rounded" />
              <input required placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full border p-2 rounded" />

              <div className="flex items-center gap-2">
                <input type="checkbox" checked={rememberMe} onChange={(e) => { setRememberMe(e.target.checked); if (!e.target.checked) localStorage.removeItem(REMEMBER_KEY); }} />
                <div className="text-sm">Remember me forever</div>
              </div>

              <div className="flex gap-3 justify-end">
                {authMode === 'signup' ? (
                  <button type="submit" className="px-4 py-2 bg-[#b2872f] text-white rounded">Create account</button>
                ) : (
                  <button type="submit" className="px-4 py-2 bg-[#b2872f] text-white rounded">Log in</button>
                )}
                <button type="button" onClick={() => setAuthMode(authMode === 'signup' ? 'login' : 'signup')} className="px-4 py-2 border rounded">Switch</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="text-center p-6 text-sm text-gray-600">© {new Date().getFullYear()} AG Collective — The Beauty Of The Unusual</footer>
    </div>
  );
}
