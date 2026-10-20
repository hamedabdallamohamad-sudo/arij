// واجهة متجر زينة — المنتجات والطلبات من Firebase
import { WHATSAPP_NUMBER, CATEGORIES, CURRENCY } from './config.js';
import * as db from './firebase.js';

/* ---------- أدوات ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const img = u => {
    u = String(u ?? '').trim();
    if (/^https?:\/\//i.test(u)) return esc(u);
    if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(u)) return u;
    if (/^[\w\-.]+\.(jpe?g|png|webp|gif|svg)$/i.test(u)) return 'images/' + esc(u);
    if (/^images\/[\w\-./]+$/i.test(u) && !u.includes('..')) return esc(u);
    return 'images/placeholder.svg';
};
const MAX_IMAGES = 4;
let formImages = [];
const galleryOf = p => (Array.isArray(p.images) && p.images.length ? p.images : [p.image]).filter(Boolean);
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
const state = { products: [], loaded: false, category: 'all', query: '', cart: loadCart(), isAdmin: false, orders: [], stopOrders: null, settings: {}, banners: [], editingBannerId: null };
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
    const imgs = galleryOf(p);
    const gallery = `<div class="w-full md:w-1/2 bg-stone-50">
      <div class="h-64 md:h-80"><img id="modalMainImg" src="${img(imgs[0])}" alt="${esc(p.name)}" onerror="${ONERR}" class="w-full h-full object-cover"></div>
      ${imgs.length > 1 ? `<div class="flex gap-2 p-2 overflow-x-auto">${imgs.map(s => `<img src="${img(s)}" alt="" onclick="document.getElementById('modalMainImg').src=this.src" class="w-14 h-14 rounded-lg object-cover cursor-pointer border border-stone-200 hover:border-rose-500">`).join('')}</div>` : ''}
    </div>`;
    const rows = [['اللون', p.color], ['المقاس / الأبعاد', p.size], ['العناية', p.care]].filter(r => r[1])
        .map(([k, v]) => `<div class="flex justify-between gap-3 text-xs py-1.5 border-b border-stone-100"><span class="font-bold text-stone-700">${k}</span><span class="text-stone-500">${esc(v)}</span></div>`).join('');
    $('modalContent').innerHTML = `
    ${gallery}
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
        ${rows ? `<div class="mt-3">${rows}</div>` : ''}
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
}function toggleCart(open = null) {
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

const CUSTOMER_KEY = 'zayna_customer';
const COUNTRY_CODE = '249';
const intlPhone = p => { let d = String(p).replace(/\D/g, ''); if (d.startsWith('00')) d = d.slice(2); else if (d.startsWith('0')) d = COUNTRY_CODE + d.slice(1); return d; };

function checkoutViaWhatsApp() {
    const items = cartItems();
    if (!items.length) return toast('الحقيبة فارغة! أضيفي قطعاً أولاً.', true);
    let saved = {}; try { saved = JSON.parse(localStorage.getItem(CUSTOMER_KEY)) || {}; } catch {}
    ['Name', 'Phone', 'City', 'Address'].forEach(k => $('cust' + k).value = saved[k.toLowerCase()] || '');
    $('custNotes').value = '';
    $('checkoutSummary').textContent = `${items.reduce((n, i) => n + i.qty, 0)} قطعة — المجموع: ${money(items.reduce((t, i) => t + i.price * i.qty, 0))}`;
    show('checkoutModal');
}
const closeCheckout = () => hide('checkoutModal');

function confirmOrder(e) {
    e.preventDefault();
    const items = cartItems();
    if (!items.length) { closeCheckout(); return toast('الحقيبة فارغة', true); }
    const customer = {
        name: $('custName').value.trim(), phone: $('custPhone').value.trim(), city: $('custCity').value.trim(),
        address: $('custAddress').value.trim(), notes: $('custNotes').value.trim()
    };
    const digits = intlPhone(customer.phone);
    if (digits.length < 8 || digits.length > 15) return toast('رقم الجوال غير صحيح', true);
    try { localStorage.setItem(CUSTOMER_KEY, JSON.stringify({ name: customer.name, phone: customer.phone, city: customer.city, address: customer.address })); } catch {}
    const total = items.reduce((s, i) => s + i.price * i.qty, 0);
    const orderNo = 'Z-' + Date.now().toString(36).toUpperCase();
    const lines = items.map(i => `• ${i.name} ×${i.qty} = ${money(i.price * i.qty)}`);
    const text = `مرحباً زينة 👋\nأرغب بإتمام الطلب رقم ${orderNo}:\n${lines.join('\n')}\n\nالمجموع: ${money(total)}\n\n` +
        `بيانات العميل:\nالاسم: ${customer.name}\nالجوال: ${customer.phone}\nالمدينة: ${customer.city}\nالعنوان: ${customer.address}` +
        (customer.notes ? `\nملاحظات: ${customer.notes}` : '');
    db.createOrder({ orderNo, total, customer, items: items.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })) })
        .catch(e => console.warn('تعذّر حفظ الطلب:', e));
    window.open(`https://wa.me/${currentWhatsAppNumber()}?text=${encodeURIComponent(text)}`, '_blank');
    state.cart = []; renderCart(); closeCheckout(); toggleCart(false);
    toast('تم تجهيز طلبك — أرسليه من واتساب لإتمامه ✨');
}

function initCheckoutUI() {
    const inp = 'w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none';
    const f = (id, label, attrs = '') => `<div><label class="block text-xs font-bold text-stone-700 mb-1">${label}</label><input id="${id}" ${attrs} class="${inp}"></div>`;
    document.body.insertAdjacentHTML('beforeend', `
    <div id="checkoutModal" class="fixed inset-0 z-[55] hidden items-center justify-center p-4 bg-black/60 backdrop-blur-sm flex">
      <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button type="button" onclick="closeCheckout()" class="absolute top-4 left-4 text-stone-400 hover:text-stone-600"><i class="fa-solid fa-xmark"></i></button>
        <h3 class="text-xl font-bold text-stone-900">بيانات التوصيل</h3>
        <p id="checkoutSummary" class="text-xs text-rose-700 font-bold mt-1 mb-4"></p>
        <form onsubmit="confirmOrder(event)" class="space-y-3">
          ${f('custName', 'الاسم', 'required maxlength="80" autocomplete="name"')}
          ${f('custPhone', 'رقم الجوال (واتساب)', 'type="tel" required maxlength="20" autocomplete="tel" dir="ltr" placeholder="09XXXXXXXX"')}
          ${f('custCity', 'المدينة', 'required maxlength="60"')}
          ${f('custAddress', 'العنوان', 'required maxlength="200" placeholder="الحي، الشارع، أقرب معلم"')}
          <div><label class="block text-xs font-bold text-stone-700 mb-1">ملاحظات <span class="font-normal text-stone-400">(اختياري)</span></label>
            <textarea id="custNotes" rows="2" maxlength="300" class="${inp}"></textarea></div>
          <button type="submit" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition flex items-center justify-center gap-2">
            <i class="fa-brands fa-whatsapp text-xl"></i> إرسال الطلب عبر واتساب</button>
        </form>
      </div>
    </div>`);
    $('adminOrdersTable').closest('table').querySelector('thead tr').insertAdjacentHTML('beforeend', '<th class="p-4">العميل</th>');
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
    if (!state.isAdmin) return openAdminModal();
    const tabs = {
        products: 'adminProductsTab',
        orders: 'adminOrdersTab',
        settings: 'adminSettingsTab',
        banners: 'adminBannersTab'
    };
    Object.entries(tabs).forEach(([key, id]) => $(id)?.classList.toggle('hidden', key !== tab));
    Object.keys(tabs).forEach(key => {
        const b = $('tabBtn' + key[0].toUpperCase() + key.slice(1));
        if (!b) return;
        const on = key === tab;
        b.classList.toggle('border-rose-600', on);
        b.classList.toggle('text-rose-800', on);
        b.classList.toggle('border-transparent', !on);
        b.classList.toggle('text-stone-500', !on);
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
    <td class="p-4 text-stone-500">${o.createdAt ? o.createdAt.toDate().toLocaleString('ar') : '—'}</td>
    <td class="p-4 text-xs">${o.customer ? `<div class="font-bold text-sm">${esc(o.customer.name)}</div>
      <a href="https://wa.me/${intlPhone(o.customer.phone)}" target="_blank" rel="noopener" dir="ltr" class="text-green-700 underline">${esc(o.customer.phone)}</a>
      <div class="text-stone-500">${esc(o.customer.city)} — ${esc(o.customer.address)}</div>
      ${o.customer.notes ? `<div class="text-amber-700">📝 ${esc(o.customer.notes)}</div>` : ''}` : '—'}</td></tr>`).join('')
        : '<tr><td colspan="5" class="p-8 text-center text-stone-500">لا توجد طلبات بعد.</td></tr>';
}/* ---------- إعدادات المتجر والبنرات ---------- */
const DEFAULT_SETTINGS = {
    storeName: 'Zayna | زينة',
    tagline: 'عالم الأناقة والإكسسوارات',
    storeDescription: 'وجهتك الأولى لاقتناء أجمل الإكسسوارات والمجوهرات النسائية بالجودة العالية والتصميم العصري.',
    heroTitle: 'بريقٌ يكمّل إطلالتكِ الساحرة',
    heroDescription: 'اكتشفي تشكيلة مميزة من أحدث الإكسسوارات والمجوهرات المصممة بعناية لتضفي لمسة أناقة لكل مناسبة.',
    logoUrl: '',
    heroImage: '',
    whatsappNumber: WHATSAPP_NUMBER
};

const currentWhatsAppNumber = () =>
    String(state.settings.whatsappNumber || WHATSAPP_NUMBER).replace(/\D/g, '');

function applyStoreSettings() {
    const s = { ...DEFAULT_SETTINGS, ...state.settings };
    if ($('storeNameText')) $('storeNameText').textContent = s.storeName;
    if ($('storeTaglineText')) $('storeTaglineText').textContent = s.tagline;
    if ($('footerStoreDescription')) $('footerStoreDescription').textContent = s.storeDescription;
    if ($('heroTitle')) $('heroTitle').textContent = s.heroTitle;
    if ($('heroDescription')) $('heroDescription').textContent = s.heroDescription;
    if ($('footerStoreName')) {
        $('footerStoreName').innerHTML = '<span class="w-7 h-7 rounded-full bg-amber-500 text-stone-900 text-sm font-bold flex items-center justify-center">Z</span>' + esc(s.storeName);
    }
    const logo = $('storeLogoMark');
    if (logo) {
        if (s.logoUrl && /^https?:\/\//i.test(s.logoUrl)) {
            logo.innerHTML = `<img src="${esc(s.logoUrl)}" alt="شعار المتجر" class="w-full h-full rounded-full object-cover" onerror="this.parentElement.textContent='Z'">`;
        } else {
            logo.textContent = 'Z';
        }
    }
    const heroImg = $('heroImage');
    if (heroImg) {
        heroImg.src = s.heroImage && /^https?:\/\//i.test(s.heroImage) ? s.heroImage : 'images/hero.jpg';
    }
    if ($('whatsappFooterLink')) $('whatsappFooterLink').href = `https://wa.me/${currentWhatsAppNumber()}`;

    if ($('settingStoreName') && document.activeElement?.form !== $('storeSettingsForm')) {
        $('settingStoreName').value = s.storeName;
        $('settingTagline').value = s.tagline;
        $('settingStoreDescription').value = s.storeDescription;
        $('settingHeroTitle').value = s.heroTitle;
        $('settingHeroDescription').value = s.heroDescription;
        $('settingLogoUrl').value = s.logoUrl || '';
        $('settingHeroImage').value = s.heroImage || '';
        $('settingWhatsApp').value = s.whatsappNumber || WHATSAPP_NUMBER;
    }
}

function renderBanners() {
    const active = state.banners.filter(b => b.active !== false);
    const box = $('promoBanners');
    if (box) {
        box.classList.toggle('hidden', active.length === 0);
        box.innerHTML = active.map(b => {
            const link = safeBannerLink(b.link);
            const body = `<div class="relative overflow-hidden rounded-2xl bg-stone-900 text-white shadow-lg">
                <img src="${img(b.image)}" alt="${esc(b.title || 'عرض خاص')}" loading="lazy" onerror="${ONERR}" class="absolute inset-0 w-full h-full object-cover opacity-35">
                <div class="relative z-10 p-6 sm:p-10 min-h-48 flex flex-col items-start justify-center">
                    <h3 class="text-2xl sm:text-3xl font-extrabold mb-2">${esc(b.title || '')}</h3>
                    ${b.description ? `<p class="max-w-2xl text-sm sm:text-base text-white/90 mb-4">${esc(b.description)}</p>` : ''}
                    ${link && b.buttonText ? `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer" class="inline-flex bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2.5 rounded-xl">${esc(b.buttonText)}</a>` : ''}
                </div>
            </div>`;
            return `<div class="mb-4">${body}</div>`;
        }).join('');
    }
    const table = $('adminBannersTable');
    if (table) {
        table.innerHTML = state.banners.length ? state.banners.map(b => `
            <tr>
              <td class="p-3"><div class="flex items-center gap-3 min-w-52"><img src="${img(b.image)}" alt="" class="w-14 h-12 object-cover rounded-lg"><div><div class="font-bold">${esc(b.title)}</div><div class="text-xs text-stone-500">${esc(b.description || '')}</div></div></div></td>
              <td class="p-3">${Number(b.position || 0)}</td>
              <td class="p-3">${b.active === false ? '<span class="text-stone-500">مخفي</span>' : '<span class="text-green-700">ظاهر</span>'}</td>
              <td class="p-3 whitespace-nowrap">
                <button onclick="editBanner('${esc(b.id)}')" class="text-blue-600 px-2" title="تعديل"><i class="fa-solid fa-pen"></i></button>
                <button onclick="toggleBanner('${esc(b.id)}')" class="text-amber-600 px-2" title="إظهار/إخفاء"><i class="fa-solid fa-eye"></i></button>
                <button onclick="deleteBanner('${esc(b.id)}')" class="text-red-600 px-2" title="حذف"><i class="fa-solid fa-trash"></i></button>
              </td>
            </tr>`).join('') : '<tr><td colspan="4" class="p-6 text-center text-stone-500">لا توجد بنرات بعد. أضيفي أول بنر من النموذج أعلاه.</td></tr>';
    }
}

function safeBannerLink(value) {
    const link = String(value || '').trim();
    if (!link) return '';
    if (/^https?:\/\//i.test(link) || /^#[-\w]+$/.test(link)) return link;
    return '';
}

function fillSettingsForm() {
    const s = { ...DEFAULT_SETTINGS, ...state.settings };
    $('settingStoreName').value = s.storeName;
    $('settingTagline').value = s.tagline;
    $('settingStoreDescription').value = s.storeDescription;
    $('settingHeroTitle').value = s.heroTitle;
    $('settingHeroDescription').value = s.heroDescription;
    $('settingLogoUrl').value = s.logoUrl || '';
    $('settingHeroImage').value = s.heroImage || '';
    $('settingWhatsApp').value = s.whatsappNumber || WHATSAPP_NUMBER;
}

async function saveSettingsForm(e) {
    e.preventDefault();
    if (!state.isAdmin) return toast('سجّلي الدخول كمديرة أولاً', true);
    const whatsappNumber = $('settingWhatsApp').value.replace(/\D/g, '');
    if (whatsappNumber.length < 8 || whatsappNumber.length > 15) return toast('تحققي من رقم واتساب مع رمز الدولة', true);
    const data = {
        storeName: $('settingStoreName').value.trim(),
        tagline: $('settingTagline').value.trim(),
        storeDescription: $('settingStoreDescription').value.trim(),
        heroTitle: $('settingHeroTitle').value.trim(),
        heroDescription: $('settingHeroDescription').value.trim(),
        logoUrl: $('settingLogoUrl').value.trim(),
        heroImage: $('settingHeroImage').value.trim(),
        whatsappNumber
    };
    try {
        await db.saveStoreSettings(data);
        state.settings = { ...state.settings, ...data };
        applyStoreSettings();
        fillSettingsForm();
        toast('تم حفظ إعدادات المتجر بنجاح ✨');
    } catch (error) {
        console.error(error);
        toast('تعذّر حفظ الإعدادات؛ تأكدي من حساب المدير وقواعد Firestore', true);
    }
}

function resetBannerForm() {
    state.editingBannerId = null;
    $('bannerForm')?.reset();
    $('editBannerId').value = '';
    $('bannerPosition').value = String(state.banners.length + 1);
    $('bannerActive').checked = true;
    $('bannerFormTitle').textContent = 'إضافة بنر إعلاني';
}

function editBanner(id) {
    if (!state.isAdmin) return openAdminModal();
    const b = state.banners.find(x => x.id === id);
    if (!b) return toast('لم يتم العثور على البنر', true);
    state.editingBannerId = id;
    $('editBannerId').value = id;
    $('bannerTitle').value = b.title || '';
    $('bannerImage').value = b.image || '';
    $('bannerDescription').value = b.description || '';
    $('bannerLink').value = b.link || '';
    $('bannerButtonText').value = b.buttonText || '';
    $('bannerPosition').value = Number(b.position || 0);
    $('bannerActive').checked = b.active !== false;
    $('bannerFormTitle').textContent = 'تعديل البنر الإعلاني';
    switchAdminTab('banners');
    $('bannerForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function saveBannerForm(e) {
    e.preventDefault();
    if (!state.isAdmin) return toast('سجّلي الدخول كمديرة أولاً', true);
    const imageUrl = $('bannerImage').value.trim();
    if (!/^https?:\/\//i.test(imageUrl)) return toast('أدخلي رابط صورة يبدأ بـ https:// أو http://', true);
    const link = safeBannerLink($('bannerLink').value);
    if ($('bannerLink').value.trim() && !link) return toast('رابط الزر غير صالح؛ استخدمي رابط http أو https', true);
    const data = {
        title: $('bannerTitle').value.trim(),
        image: imageUrl,
        description: $('bannerDescription').value.trim(),
        link,
        buttonText: $('bannerButtonText').value.trim(),
        position: Math.max(0, Number($('bannerPosition').value || 0)),
        active: $('bannerActive').checked
    };
    try {
        await db.saveBanner($('editBannerId').value || null, data);
        resetBannerForm();
        toast('تم حفظ البنر بنجاح ✨');
    } catch (error) {
        console.error(error);
        toast('تعذّر حفظ البنر؛ تأكدي من تسجيل الدخول وقواعد Firestore', true);
    }
}

async function toggleBanner(id) {
    if (!state.isAdmin) return openAdminModal();
    const b = state.banners.find(x => x.id === id);
    if (!b) return;
    try {
        await db.saveBanner(id, { active: b.active === false });
        toast(b.active === false ? 'تم إظهار البنر' : 'تم إخفاء البنر');
    } catch (error) {
        console.error(error);
        toast('تعذّر تغيير حالة البنر', true);
    }
}

async function deleteBanner(id) {
    if (!state.isAdmin) return openAdminModal();
    if (!confirm('هل تريدين حذف هذا البنر نهائياً؟')) return;
    try {
        await db.removeBanner(id);
        if (state.editingBannerId === id) resetBannerForm();
        toast('تم حذف البنر');
    } catch (error) {
        console.error(error);
        toast('تعذّر حذف البنر', true);
    }
}// تصغير الصورة في المتصفح قبل حفظها (حتى 800px) لتبقى خفيفة
function compressImage(file, max = 700, quality = 0.75) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const im = new Image();
        im.onload = () => {
            const r = Math.min(1, max / Math.max(im.width, im.height));
            const c = document.createElement('canvas');
            c.width = Math.round(im.width * r);
            c.height = Math.round(im.height * r);
            const ctx = c.getContext('2d');
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, c.width, c.height);
            ctx.drawImage(im, 0, 0, c.width, c.height);
            URL.revokeObjectURL(url);
            let q = quality, out = c.toDataURL('image/jpeg', q);
            while (out.length > 170000 && q > 0.4) {
                q -= 0.1;
                out = c.toDataURL('image/jpeg', q);
            }
            out.length > 230000 ? reject(new Error('big')) : resolve(out);
        };
        im.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('bad'));
        };
        im.src = url;
    });
}

async function handleImageFile(input) {
    for (const f of [...input.files]) {
        if (formImages.length >= MAX_IMAGES) {
            toast(`الحد الأقصى ${MAX_IMAGES} صور`, true);
            break;
        }
        try {
            formImages.push(await compressImage(f));
        } catch {
            toast('تعذّرت معالجة إحدى الصور، جرّبي JPG أو PNG', true);
        }
    }
    input.value = '';
    renderFormImages();
}

function renderFormImages() {
    $('formImagesList').innerHTML = formImages.map((src, i) => `
    <div class="relative w-20 h-20">
      <img src="${img(src)}" alt="" class="w-20 h-20 rounded-xl object-cover border ${i === 0 ? 'border-rose-500 ring-2 ring-rose-200' : 'border-stone-200'}">
      ${i === 0 ? '<span class="absolute bottom-0 inset-x-0 bg-rose-600 text-white text-[10px] text-center rounded-b-xl">الرئيسية</span>'
                : `<button type="button" onclick="makeMainImage(${i})" class="absolute bottom-0 inset-x-0 bg-stone-900/70 text-white text-[10px] rounded-b-xl">رئيسية</button>`}
      <button type="button" onclick="removeFormImage(${i})" class="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-red-600 text-white text-xs leading-5">×</button>
    </div>`).join('') || '<p class="text-xs text-stone-400">لم تُضف صور بعد</p>';
}

function makeMainImage(i) {
    formImages.unshift(...formImages.splice(i, 1));
    renderFormImages();
}

function removeFormImage(i) {
    formImages.splice(i, 1);
    renderFormImages();
}

// يبني واجهة الصور المتعددة وحقول التفاصيل داخل النموذج الموجود في index.html
function initFormUI() {
    const box = $('formImage')?.parentElement;
    if (!box) return;

    const inp = 'w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none';

    box.innerHTML = `<label class="block text-xs font-bold text-stone-700 mb-1">صور القطعة (حتى ${MAX_IMAGES})</label>
      <div id="formImagesList" class="flex flex-wrap gap-3 mb-3"></div>
      <input type="file" id="formImageFile" accept="image/*" multiple onchange="handleImageFile(this)"
        class="block w-full text-xs text-stone-600 file:ml-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-rose-50 file:text-rose-700 file:font-bold hover:file:bg-rose-100">
      <p class="text-[11px] text-stone-400 mt-1">الأولى هي الرئيسية، وتُصغَّر الصور تلقائياً</p>`;

    const extra = document.createElement('div');
    extra.className = 'grid grid-cols-1 sm:grid-cols-3 gap-3';
    extra.innerHTML = [
        ['formColor', 'اللون', 'ذهبي، فضي...'],
        ['formSize', 'المقاس / الأبعاد', 'طول السلسلة 45 سم'],
        ['formCare', 'العناية', 'تجنّبي الماء والعطور']
    ].map(([id, l, ph]) =>
        `<div><label class="block text-xs font-bold text-stone-700 mb-1">${l} <span class="font-normal text-stone-400">(اختياري)</span></label><input type="text" id="${id}" placeholder="${ph}" class="${inp}"></div>`
    ).join('');

    $('formDescription').parentElement.after(extra);
    $('productModal').firstElementChild.classList.add('max-h-[90vh]', 'overflow-y-auto');
}

function openProductFormModal(p = null) {
    $('productForm').reset();
    $('editProductId').value = p?.id || '';
    $('formModalTitle').textContent = p ? 'تعديل القطعة' : 'إضافة قطعة جديدة';
    formImages = p ? galleryOf(p) : [];
    renderFormImages();

    if (p) {
        $('formName').value = p.name;
        $('formCategory').value = p.category;
        $('formPrice').value = p.price;
        $('formNotes').value = p.notes;
        $('formDescription').value = p.description;
        $('formColor').value = p.color || '';
        $('formSize').value = p.size || '';
        $('formCare').value = p.care || '';
    }

    show('productFormModal');
}

const closeProductFormModal = () => hide('productFormModal');
const editProduct = id => openProductFormModal(state.products.find(p => p.id === id));

async function handleSaveProduct(e) {
    e.preventDefault();

    const data = {
        name: $('formName').value.trim(),
        category: $('formCategory').value,
        price: Number($('formPrice').value),
        image: formImages[0] || '',
        images: formImages,
        color: $('formColor').value.trim(),
        size: $('formSize').value.trim(),
        care: $('formCare').value.trim(),
        notes: $('formNotes').value.trim(),
        description: $('formDescription').value.trim()
    };

    if (!data.image) return toast('اختاري صورة واحدة على الأقل', true);
    if (formImages.join('').length > 900000) return toast('حجم الصور كبير، احذفي صورة أو اختاري أصغر', true);

    try {
        await db.saveProduct($('editProductId').value || null, data);
        closeProductFormModal();
        toast('تم حفظ القطعة ✨');
    } catch {
        toast('تعذّر الحفظ — تأكدي من تسجيل الدخول وقواعد Firestore', true);
    }
}

async function deleteProduct(id) {
    if (!confirm('هل تريدين حذف هذه القطعة نهائياً؟')) return;
    try {
        await db.removeProduct(id);
        toast('تم الحذف');
    } catch {
        toast('تعذّر الحذف', true);
    }
}

async function seedDemo() {
    const mk = (name, category, price, notes, description) =>
        ({ name, category, price, image: '', notes, description });

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
    } catch {
        toast('تعذّرت الإضافة', true);
    }
}

/* ---------- التشغيل ---------- */
document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    ['productModal', 'quizModal', 'adminAuthModal', 'productFormModal', 'checkoutModal'].forEach(hide);
    if (!$('cartDrawer').classList.contains('invisible')) toggleCart(false);
});

db.watchProducts(list => {
    state.products = list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    state.loaded = true;
    renderStore();
    renderCart();
    renderAdmin();
}, () => {
    state.loaded = true;
    renderStore();
    toast('تعذّر تحميل المنتجات — راجعي إعدادات Firebase', true);
});

db.onAuth(user => {
    state.isAdmin = !!user;
    state.stopOrders?.();
    state.stopOrders = null;

    if (user) {
        state.stopOrders = db.watchOrders(
            o => { state.orders = o; renderAdmin(); },
            () => toast('لا صلاحية لقراءة الطلبات', true)
        );
    } else {
        state.orders = [];
        renderAdmin();
    }
});

initFormUI();
initCheckoutUI();

$('storeSettingsForm')?.addEventListener('submit', saveSettingsForm);
$('bannerForm')?.addEventListener('submit', saveBannerForm);

applyStoreSettings();
fillSettingsForm();
renderBanners();
filterCategory('all');
renderCart();

db.watchStoreSettings(settings => {
    state.settings = settings || {};
    applyStoreSettings();
    if (document.activeElement?.form !== $('storeSettingsForm')) fillSettingsForm();
}, error => {
    console.warn('تعذّر تحميل إعدادات المتجر:', error);
    applyStoreSettings();
});

db.watchBanners(banners => {
    state.banners = banners || [];
    renderBanners();
}, error => {
    console.warn('تعذّر تحميل البنرات:', error);
    renderBanners();
});

// index.html يستدعي الدوال عبر onclick، فنعرضها عالمياً
Object.assign(window, {
    switchView,
    filterCategory,
    handleSearch,
    openProductModal,
    closeProductModal,
    openQuiz,
    closeQuiz,
    recommendProduct,
    addToCart,
    changeQuantity,
    removeFromCart,
    toggleCart,
    checkoutViaWhatsApp,
    openAdminModal,
    closeAdminAuthModal,
    adminLogin,
    adminLogout,
    openProductFormModal,
    closeProductFormModal,
    editProduct,
    handleSaveProduct,
    deleteProduct,
    seedDemo,
    handleImageFile,
    makeMainImage,
    removeFormImage,
    confirmOrder,
    closeCheckout,
    switchAdminTab,
    resetBannerForm,
    editBanner,
    toggleBanner,
    deleteBanner
});