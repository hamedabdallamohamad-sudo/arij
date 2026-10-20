// واجهة متجر زينة — المنتجات والطلبات من Firebase
import { WHATSAPP_NUMBER, CATEGORIES, CURRENCY } from './config.js';
import * as db from './firebase.js';

/* ---------- أدوات ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const img = u => {
    u = String(u ?? '').trim();
    if (/^https?:\/\//i.test(u)) return esc(u);                                    // رابط كامل
    if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(u)) return u;   // صورة مرفوعة من الجهاز
    if (/^[\w\-.]+\.(jpe?g|png|webp|gif|svg)$/i.test(u)) return 'images/' + esc(u); // اسم ملف فقط
    if (/^images\/[\w\-./]+$/i.test(u) && !u.includes('..')) return esc(u);       // images/اسم.jpg
    return 'images/placeholder.svg';
};
const money = n => `${Number(n || 0).toLocaleString('en-US')} ${CURRENCY}`;
const ONERR = "this.onerror=null;this.src='images/placeholder.svg'";
const show = id => $(id).classList.remove('hidden');
const hide = id => $(id).classList.add('hidden');

function toast(msg, error = false) {
    const t = document.createElement('div');
    t.className = `fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-full text-sm font-bold shadow-xl transition-opacity duration-300 opacity-0 ${error ? 'bg-red-700 text-white' : 'bg-stone-900 text-amber-300'}`;
    t.textContent = msg;
    document.body.append(t);
    requestAnimationFrame(() => t.classList.remove('opacity-0'));
    setTimeout(() => { t.classList.add('opacity-0'); setTimeout(() => t.remove(), 300); }, 2800);
}

/* ---------- الحالة ---------- */
const CART_KEY = 'zayna_cart_v2';
const loadCart = () => { try { const c = JSON.parse(localStorage.getItem(CART_KEY)); return Array.isArray(c) ? c : []; } catch { return []; } };
const state = { products: [], loaded: false, category: 'all', query: '', cart: loadCart(), isAdmin: false, orders: [], stopOrders: null };
const saveCart = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(state.cart)); } catch {} };

/* ---------- المتجر ---------- */
const card = p => `
<div class="bg-white rounded-2xl overflow-hidden border border-stone-200/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group">
  <div class="relative overflow-hidden aspect-square cursor-pointer" onclick="openProductModal('${esc(p.id)}')">
    <img src="${img(p.image)}" alt="${esc(p.name)}" loading="lazy" onerror="${ONERR}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
    ${p.rating ? `<span class="absolute top-3 right-3 bg-stone-900/80 text-amber-300 text-xs font-bold px-2.5 py-1 rounded-full">★ ${esc(p.rating)}</span>` : ''}
  </div>
  <div class="p-5 flex flex-col flex-grow justify-between">
    <div>
      <h3 class="font-bold text-stone-900 text-lg mb-1 hover:text-rose-700 transition cursor-pointer" onclick="openProductModal('${esc(p.id)}')">${esc(p.name)}</h3>
      <p class="text-xs text-stone-500 mb-3 line-clamp-1"><i class="fa-solid fa-gem text-rose-600 ml-1"></i>${esc(p.notes)}</p>
    </div>
    <div class="flex items-center justify-between pt-3 border-t border-stone-100">
      <span class="text-xl font-bold text-stone-900">${esc(p.price)} <span class="text-xs text-stone-500 font-normal">${CURRENCY}</span></span>
      <button onclick="addToCart('${esc(p.id)}')" class="bg-stone-900 hover:bg-rose-700 text-white px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 text-sm font-medium shadow-md"><i class="fa-solid fa-plus"></i> إضافة</button>
    </div>
  </div>
</div>`;

function renderStore() {
    const q = state.query.trim().toLowerCase();
    const list = state.products.filter(p =>
        (state.category === 'all' || p.category === state.category) &&
        (!q || `${p.name} ${p.notes}`.toLowerCase().includes(q)));
    $('noResults').classList.toggle('hidden', !state.loaded || list.length > 0);
    $('productsGrid').innerHTML = state.loaded
        ? list.map(card).join('')
        : '<p class="col-span-full text-center text-stone-400 py-16">جارٍ تحميل المنتجات...</p>';
}

function filterCategory(cat) {
    state.category = cat;
    document.querySelectorAll('.category-btn').forEach(b => {
        const on = b.dataset.cat === cat;
        b.classList.toggle('bg-stone-900', on); b.classList.toggle('text-white', on);
        b.classList.toggle('bg-stone-200', !on); b.classList.toggle('text-stone-700', !on);
    });
    renderStore();
}
function handleSearch() { state.query = $('searchInput').value; renderStore(); }

function openProductModal(id) {
    const p = state.products.find(x => x.id === id); if (!p) return;
    $('modalContent').innerHTML = `
    <div class="w-full md:w-1/2 h-64 md:h-auto"><img src="${img(p.image)}" alt="${esc(p.name)}" onerror="${ONERR}" class="w-full h-full object-cover"></div>
    <div class="w-full md:w-1/2 p-6 flex flex-col justify-between">
      <div>
        <span class="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200/60 inline-block mb-2">${esc(CATEGORIES[p.category] || 'إكسسوار')}</span>
        <h3 class="text-2xl font-bold text-stone-900">${esc(p.name)}</h3>
        <p class="text-rose-800 font-bold text-2xl mt-2">${esc(p.price)} <span class="text-sm text-stone-500 font-normal">${CURRENCY}</span></p>
        <p class="text-stone-600 text-sm mt-4 leading-relaxed">${esc(p.description)}</p>
        <div class="mt-4 p-3 bg-stone-50 rounded-xl border border-stone-100">
          <span class="text-xs font-bold text-stone-700 block mb-1">الخامة والمواد:</span>
          <span class="text-xs text-stone-500">${esc(p.notes)}</span>
        </div>
      </div>
      <button onclick="addToCart('${esc(p.id)}'); closeProductModal();" class="mt-6 w-full bg-stone-900 hover:bg-rose-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg">إضافة إلى الحقيبة</button>
    </div>`;
    show('productModal');
}
const closeProductModal = () => hide('productModal');
const openQuiz = () => show('quizModal');
const closeQuiz = () => hide('quizModal');
function recommendProduct(cat) { closeQuiz(); switchView('store'); filterCategory(cat); $('products').scrollIntoView({ behavior: 'smooth' }); }

/* ---------- السلة ---------- */
const cartItems = () => state.cart.map(c => { const p = state.products.find(x => x.id === c.id); return p && { ...p, qty: c.qty }; }).filter(Boolean);

function addToCart(id) {
    const c = state.cart.find(x => x.id === id);
    c ? c.qty++ : state.cart.push({ id, qty: 1 });
    renderCart(); toggleCart(true);
}
function changeQuantity(id, d) {
    const c = state.cart.find(x => x.id === id); if (!c) return;
    c.qty += d;
    if (c.qty <= 0) state.cart = state.cart.filter(x => x.id !== id);
    renderCart();
}
function removeFromCart(id) { state.cart = state.cart.filter(x => x.id !== id); renderCart(); }

function renderCart() {
    saveCart();
    const items = cartItems();
    $('cartCount').textContent = items.reduce((s, i) => s + i.qty, 0);
    $('cartTotal').textContent = money(items.reduce((s, i) => s + i.price * i.qty, 0));
    $('cartItems').innerHTML = items.length ? items.map(i => `
    <div class="flex items-center gap-4 bg-stone-50 p-3 rounded-xl border border-stone-200">
      <img src="${img(i.image)}" alt="${esc(i.name)}" onerror="${ONERR}" class="w-16 h-16 rounded-lg object-cover">
      <div class="flex-grow">
        <h4 class="font-bold text-stone-900 text-sm">${esc(i.name)}</h4>
        <span class="text-rose-800 font-bold text-sm">${money(i.price)}</span>
        <div class="flex items-center gap-2 mt-2">
          <button onclick="changeQuantity('${esc(i.id)}',-1)" class="w-6 h-6 rounded bg-stone-200 hover:bg-stone-300 text-xs font-bold">-</button>
          <span class="text-xs font-bold px-1">${i.qty}</span>
          <button onclick="changeQuantity('${esc(i.id)}',1)" class="w-6 h-6 rounded bg-stone-200 hover:bg-stone-300 text-xs font-bold">+</button>
        </div>
      </div>
      <button onclick="removeFromCart('${esc(i.id)}')" class="text-stone-400 hover:text-red-500 p-2 transition"><i class="fa-solid fa-trash-can"></i></button>
    </div>`).join('') : `
    <div class="text-center py-16 text-stone-400"><i class="fa-solid fa-bag-shopping text-5xl mb-3"></i>
    <p class="font-medium text-stone-500">الحقيبة فارغة حالياً</p><p class="text-xs mt-1">تصفحي القطع وأضيفيها للحقيبة</p></div>`;
}

function toggleCart(open = null) {
    const drawer = $('cartDrawer');
    const opening = open ?? drawer.classList.contains('invisible');
    if (opening) {
        drawer.classList.remove('invisible');
        setTimeout(() => { $('cartBackdrop').classList.remove('opacity-0'); $('cartPanel').classList.remove('-translate-x-full'); }, 10);
    } else {
        $('cartBackdrop').classList.add('opacity-0'); $('cartPanel').classList.add('-translate-x-full');
        setTimeout(() => drawer.classList.add('invisible'), 300);
    }
}

function checkoutViaWhatsApp() {
    const items = cartItems();
    if (!items.length) return toast('الحقيبة فارغة! أضيفي قطعاً أولاً.', true);
    const total = items.reduce((s, i) => s + i.price * i.qty, 0);
    const orderNo = 'Z-' + Date.now().toString(36).toUpperCase();
    const lines = items.map(i => `• ${i.name} ×${i.qty} = ${money(i.price * i.qty)}`);
    const text = `مرحباً زينة 👋\nأرغب بإتمام الطلب رقم ${orderNo}:\n${lines.join('\n')}\n\nالمجموع: ${money(total)}`;
    // حفظ الطلب في Firestore (لا نمنع واتساب إن فشل الحفظ)
    db.createOrder({ orderNo, total, items: items.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })) })
        .catch(e => console.warn('تعذّر حفظ الطلب:', e));
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank');
    state.cart = []; renderCart(); toggleCart(false);
}

/* ---------- الإدارة ---------- */
function switchView(v) {
    if (v === 'admin' && !state.isAdmin) return openAdminModal();
    $('storeView').classList.toggle('hidden', v === 'admin');
    $('adminView').classList.toggle('hidden', v !== 'admin');
    window.scrollTo(0, 0);
}
function openAdminModal() { state.isAdmin ? switchView('admin') : show('adminAuthModal'); }
const closeAdminAuthModal = () => hide('adminAuthModal');

async function adminLogin() {
    const email = $('adminEmailInput').value.trim(), pass = $('adminPasswordInput').value;
    if (!email || !pass) return toast('أدخلي البريد وكلمة المرور', true);
    try {
        await db.login(email, pass);
        $('adminPasswordInput').value = '';
        closeAdminAuthModal(); state.isAdmin = true; switchView('admin');
    } catch { toast('بيانات الدخول غير صحيحة', true); }
}
async function adminLogout() { await db.logout(); switchView('store'); }

function switchAdminTab(tab) {
    const prod = tab === 'products';
    $('adminProductsTab').classList.toggle('hidden', !prod);
    $('adminOrdersTab').classList.toggle('hidden', prod);
    [['tabBtnProducts', prod], ['tabBtnOrders', !prod]].forEach(([id, on]) => {
        const b = $(id);
        b.classList.toggle('border-rose-600', on); b.classList.toggle('text-rose-800', on);
        b.classList.toggle('border-transparent', !on); b.classList.toggle('text-stone-500', !on);
    });
}

function renderAdmin() {
    $('statTotalProducts').textContent = state.products.length;
    $('statTotalOrders').textContent = state.orders.length;
    $('statTotalSales').textContent = money(state.orders.reduce((s, o) => s + (o.total || 0), 0));
    $('adminProductsTable').innerHTML = state.products.length ? state.products.map(p => `
    <tr><td class="p-4 font-bold text-stone-900">${esc(p.name)}</td>
    <td class="p-4">${esc(CATEGORIES[p.category] || p.category)}</td>
    <td class="p-4">${money(p.price)}</td><td class="p-4">${p.rating ? '★ ' + esc(p.rating) : '—'}</td>
    <td class="p-4 text-center whitespace-nowrap">
      <button onclick="editProduct('${esc(p.id)}')" class="text-blue-600 hover:text-blue-800 px-2" title="تعديل"><i class="fa-solid fa-pen"></i></button>
      <button onclick="deleteProduct('${esc(p.id)}')" class="text-red-500 hover:text-red-700 px-2" title="حذف"><i class="fa-solid fa-trash-can"></i></button>
    </td></tr>`).join('') : `<tr><td colspan="5" class="p-8 text-center text-stone-500">لا توجد منتجات بعد.
      <button onclick="seedDemo()" class="text-rose-700 font-bold underline">إضافة منتجات تجريبية</button></td></tr>`;
    $('adminOrdersTable').innerHTML = state.orders.length ? state.orders.map(o => `
    <tr><td class="p-4 font-bold">${esc(o.orderNo)}</td>
    <td class="p-4">${(o.items || []).map(i => `${esc(i.name)} ×${esc(i.qty)}`).join('، ')}</td>
    <td class="p-4 font-bold">${money(o.total)}</td>
    <td class="p-4 text-stone-500">${o.createdAt ? o.createdAt.toDate().toLocaleString('ar') : '—'}</td></tr>`).join('')
        : '<tr><td colspan="4" class="p-8 text-center text-stone-500">لا توجد طلبات بعد.</td></tr>';
}

// تصغير الصورة في المتصفح قبل حفظها (حتى 800px) لتبقى خفيفة
function compressImage(file, max = 800, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const im = new Image();
        im.onload = () => {
            const r = Math.min(1, max / Math.max(im.width, im.height));
            const c = document.createElement('canvas');
            c.width = Math.round(im.width * r); c.height = Math.round(im.height * r);
            const ctx = c.getContext('2d');
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
            ctx.drawImage(im, 0, 0, c.width, c.height);
            URL.revokeObjectURL(url);
            let q = quality, out = c.toDataURL('image/jpeg', q);
            while (out.length > 600000 && q > 0.4) { q -= 0.1; out = c.toDataURL('image/jpeg', q); }
            out.length > 900000 ? reject(new Error('big')) : resolve(out);
        };
        im.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad')); };
        im.src = url;
    });
}
async function handleImageFile(input) {
    const f = input.files[0]; if (!f) return;
    try {
        const data = await compressImage(f);
        $('formImage').value = data; $('formImagePreview').src = data;
    } catch { toast('تعذّرت معالجة الصورة، جرّبي صورة JPG أو PNG أخرى', true); input.value = ''; }
}

function openProductFormModal(p = null) {
    $('productForm').reset();
    $('editProductId').value = p?.id || '';
    $('formModalTitle').textContent = p ? 'تعديل القطعة' : 'إضافة قطعة جديدة';
    $('formImage').value = p?.image || '';   // الحقل مخفي فلا يمسحه reset()
    $('formImagePreview').src = p ? img(p.image) : 'images/placeholder.svg';
    if (p) {
        $('formName').value = p.name; $('formCategory').value = p.category; $('formPrice').value = p.price;
        $('formNotes').value = p.notes; $('formDescription').value = p.description;
    }
    show('productFormModal');
}
const closeProductFormModal = () => hide('productFormModal');
const editProduct = id => openProductFormModal(state.products.find(p => p.id === id));

async function handleSaveProduct(e) {
    e.preventDefault();
    const data = {
        name: $('formName').value.trim(), category: $('formCategory').value, price: Number($('formPrice').value),
        image: $('formImage').value.trim(), notes: $('formNotes').value.trim(), description: $('formDescription').value.trim()
    };
    if (!data.image) return toast('اختاري صورة للقطعة', true);
    try {
        await db.saveProduct($('editProductId').value || null, data);
        closeProductFormModal(); toast('تم حفظ القطعة ✨');
    } catch { toast('تعذّر الحفظ — تأكدي من تسجيل الدخول وقواعد Firestore', true); }
}
async function deleteProduct(id) {
    if (!confirm('هل تريدين حذف هذه القطعة نهائياً؟')) return;
    try { await db.removeProduct(id); toast('تم الحذف'); } catch { toast('تعذّر الحذف', true); }
}
async function seedDemo() {
    const mk = (name, category, price, notes, description) => ({ name, category, price, image: '', notes, description });
    try {
        await db.seedProducts([
            mk('سلسلة لؤلؤ كلاسيكية', 'jewelry', 120, 'مطلية بالذهب 18، لؤلؤ طبيعي', 'سلسلة أنيقة تناسب الإطلالات اليومية والمناسبات.'),
            mk('قلادة القلب الذهبي', 'jewelry', 95, 'ستانلس ستيل مطلي بالذهب', 'قلادة رقيقة بتصميم قلب ناعم.'),
            mk('أقراط زركون لامعة', 'rings', 80, 'فضة عيار 925، زركون', 'أقراط براقة تمنحك إطلالة مميزة.'),
            mk('خاتم الورد الفضي', 'rings', 70, 'فضة عيار 925', 'خاتم بتصميم وردة قابل للتعديل.'),
            mk('ساعة روز جولد', 'watches', 260, 'ستانلس ستيل، زجاج معدني', 'ساعة نسائية فاخرة بسوار ناعم.'),
            mk('ساعة كلاسيك بسوار جلد', 'watches', 220, 'جلد طبيعي، مينا بيضاء', 'ساعة كلاسيكية أنيقة لكل المناسبات.')
        ]);
        toast('تمت إضافة منتجات تجريبية — عدّلي صورها من لوحة التحكم');
    } catch { toast('تعذّرت الإضافة', true); }
}

/* ---------- التشغيل ---------- */
document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    ['productModal', 'quizModal', 'adminAuthModal', 'productFormModal'].forEach(hide);
    if (!$('cartDrawer').classList.contains('invisible')) toggleCart(false);
});

db.watchProducts(list => {
    state.products = list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    state.loaded = true; renderStore(); renderCart(); renderAdmin();
}, () => { state.loaded = true; renderStore(); toast('تعذّر تحميل المنتجات — راجعي إعدادات Firebase', true); });

db.onAuth(user => {
    state.isAdmin = !!user;
    state.stopOrders?.(); state.stopOrders = null;
    if (user) state.stopOrders = db.watchOrders(o => { state.orders = o; renderAdmin(); }, () => toast('لا صلاحية لقراءة الطلبات', true));
    else { state.orders = []; renderAdmin(); }
});

const wa = $('whatsappFooterLink');
if (wa) wa.href = `https://wa.me/${WHATSAPP_NUMBER}`;
filterCategory('all'); renderCart();

// index.html يستدعي الدوال عبر onclick، فنعرضها عالمياً
Object.assign(window, { switchView, filterCategory, handleSearch, openProductModal, closeProductModal, openQuiz, closeQuiz,
    recommendProduct, addToCart, changeQuantity, removeFromCart, toggleCart, checkoutViaWhatsApp, openAdminModal,
    closeAdminAuthModal, adminLogin, adminLogout, switchAdminTab, openProductFormModal, closeProductFormModal,
    editProduct, handleSaveProduct, deleteProduct, seedDemo, handleImageFile });