// Database of Perfumes
const perfumes = [
    {
        id: 1,
        name: "سحر الشرق - العود الذهبي",
        category: "eastern",
        price: 350,
        rating: 4.9,
        image: "https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=600&q=80",
        notes: "عود سيلاني، عنبر، صندل، لمسات من الورد الجوري",
        description: "عطر شرقي ذو تركيز عالٍ يمنحك حضوراً هائباً ورائحة تدوم طوال اليوم. مصمم ليعبر عن الفخامة والروعة."
    },
    {
        id: 2,
        name: "لافي إن روز - باريس",
        category: "western",
        price: 280,
        rating: 4.8,
        image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=600&q=80",
        notes: "زهور الياسمين، الفانيلا، لمسات الفواكه الهادئة",
        description: "عطر فرنسي ناعم ورقيق يعبر عن الأناقة والجاذبية الحديثة بلمسة باريسية مبهرة."
    },
    {
        id: 3,
        name: "دهن عود الملكي المعتق",
        category: "oud",
        price: 520,
        rating: 5.0,
        image: "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=600&q=80",
        notes: "دهن عود معتق 15 سنة، خشب الصندل",
        description: "الخيار الأفضل للمناسبات الفاخرة، ثبات عالي جداً وجاذبية استثنائية تأثر الألباب."
    },
    {
        id: 4,
        name: "أمبير نايت - الملكي",
        category: "eastern",
        price: 410,
        rating: 4.7,
        image: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=600&q=80",
        notes: "عنبر دافئ، مسك أبيض، أخشاب الأرز",
        description: "مزيج ساحر يجمع بين دفء العنبر ونقاء المسك لتجربة عطريّة أسطورية."
    },
    {
        id: 5,
        name: "أوركيد الفانيلا الفاخر",
        category: "western",
        price: 290,
        rating: 4.6,
        image: "https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&w=600&q=80",
        notes: "فانيلا مدغشقر، زهرة الأوركيد، البرغموت",
        description: "عطر منعش يناسب جميع الأوقات والاستخدام اليومي بعطرية هادئة وجذابة."
    },
    {
        id: 6,
        name: "مسك ختام المعتق",
        category: "oud",
        price: 380,
        rating: 4.9,
        image: "https://images.unsplash.com/photo-1615397349754-cfa2066a298e?auto=format&fit=crop&w=600&q=80",
        notes: "مسك نقي، لمحات خشبية، نوتات البودر",
        description: "عبق مميز ورائع يعطي إحساساً رائعاً بالنظافة والانتعاش الفائق مع ثبات يدوم طويلاً."
    }
];

const CART_KEY = 'arij_cart_v1';
let currentCategory = 'all';
let cart = loadCart();

function loadCart() {
    try {
        const saved = JSON.parse(localStorage.getItem(CART_KEY));
        return Array.isArray(saved) ? saved : [];
    } catch (e) {
        return [];
    }
}

function saveCart() {
    try {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (e) { /* التخزين غير متاح - نتجاهل */ }
}

document.addEventListener('DOMContentLoaded', () => {
    renderProducts(perfumes);
    updateCartUI();
});

// إغلاق النوافذ بزر Escape
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    closeProductModal();
    closeQuiz();
    if (!document.getElementById('cartDrawer').classList.contains('invisible')) toggleCart(false);
});

// Render Product Cards
function renderProducts(items) {
    const container = document.getElementById('productsGrid');
    const noResults = document.getElementById('noResults');

    if (items.length === 0) {
        container.innerHTML = '';
        noResults.classList.remove('hidden');
        return;
    }

    noResults.classList.add('hidden');
    container.innerHTML = items.map(perfume => `
        <div class="bg-white rounded-2xl overflow-hidden border border-stone-200/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group">
            <div class="relative overflow-hidden aspect-square cursor-pointer" onclick="openProductModal(${perfume.id})">
                <img src="${perfume.image}" alt="${perfume.name}" loading="lazy" onerror="this.onerror=null;this.src=\'images/placeholder.svg\'" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
                <span class="absolute top-3 right-3 bg-stone-900/80 text-amber-300 text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-md">
                    ★ ${perfume.rating}
                </span>
            </div>
            <div class="p-5 flex flex-col flex-grow justify-between">
                <div>
                    <h3 class="font-bold text-stone-900 text-lg mb-1 hover:text-amber-700 transition cursor-pointer" onclick="openProductModal(${perfume.id})">${perfume.name}</h3>
                    <p class="text-xs text-stone-500 mb-3 line-clamp-1"><i class="fa-solid fa-wind text-amber-600 ml-1"></i>${perfume.notes}</p>
                </div>
                <div class="flex items-center justify-between pt-3 border-t border-stone-100">
                    <span class="text-xl font-bold text-stone-900">${perfume.price} <span class="text-xs text-stone-500 font-normal">ر.س</span></span>
                    <button onclick="addToCart(${perfume.id})" class="bg-stone-900 hover:bg-amber-800 text-white px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 text-xs sm:text-sm font-medium shadow-md">
                        <i class="fa-solid fa-plus"></i> إضافة
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function filterCategory(category) {
    currentCategory = category;
    
    // Update active state in UI
    document.querySelectorAll('.category-btn').forEach(btn => {
        if (btn.dataset.cat === category) {
            btn.classList.remove('bg-stone-200', 'text-stone-700');
            btn.classList.add('bg-stone-900', 'text-white');
        } else {
            btn.classList.remove('bg-stone-900', 'text-white');
            btn.classList.add('bg-stone-200', 'text-stone-700');
        }
    });

    const query = (document.getElementById('searchInput').value || document.getElementById('mobileSearchInput').value || '').toLowerCase();
    filterAndRender(query);
}

function handleSearch() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    filterAndRender(query);
}

function handleMobileSearch() {
    const query = document.getElementById('mobileSearchInput').value.toLowerCase();
    filterAndRender(query);
}

function filterAndRender(query) {
    const filtered = perfumes.filter(p => 
        (currentCategory === 'all' || p.category === currentCategory) &&
        (p.name.toLowerCase().includes(query) || p.notes.toLowerCase().includes(query))
    );
    renderProducts(filtered);
}

function addToCart(productId) {
    const product = perfumes.find(p => p.id === productId);
    const cartItem = cart.find(item => item.id === productId);

    if (cartItem) {
        cartItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    updateCartUI();
    toggleCart(true); // Open cart drawer
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartUI();
}

function changeQuantity(productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            updateCartUI();
        }
    }
}

function updateCartUI() {
    const cartItemsContainer = document.getElementById('cartItems');
    const cartCount = document.getElementById('cartCount');
    const cartTotal = document.getElementById('cartTotal');

    saveCart();
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    cartCount.innerText = totalItems;
    cartTotal.innerText = `${totalPrice} ر.س`;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="text-center py-16 text-stone-400">
                <i class="fa-solid fa-basket-shopping text-5xl mb-3"></i>
                <p class="font-medium text-stone-500">السلة فارغة حالياً</p>
                <p class="text-xs text-stone-400 mt-1">تصفح العطور وأضفها للسلة</p>
            </div>
        `;
        return;
    }

    cartItemsContainer.innerHTML = cart.map(item => `
        <div class="flex items-center gap-4 bg-stone-50 p-3 rounded-xl border border-stone-200">
            <img src="${item.image}" alt="${item.name}" onerror="this.onerror=null;this.src=\'images/placeholder.svg\'" class="w-16 h-16 rounded-lg object-cover">
            <div class="flex-grow">
                <h4 class="font-bold text-stone-900 text-sm">${item.name}</h4>
                <span class="text-amber-800 font-bold text-sm">${item.price} ر.س</span>
                <div class="flex items-center gap-2 mt-2">
                    <button onclick="changeQuantity(${item.id}, -1)" class="w-6 h-6 rounded bg-stone-200 hover:bg-stone-300 flex items-center justify-center text-xs font-bold transition">-</button>
                    <span class="text-xs font-bold px-1">${item.quantity}</span>
                    <button onclick="changeQuantity(${item.id}, 1)" class="w-6 h-6 rounded bg-stone-200 hover:bg-stone-300 flex items-center justify-center text-xs font-bold transition">+</button>
                </div>
            </div>
            <button onclick="removeFromCart(${item.id})" class="text-stone-400 hover:text-red-500 p-2 transition">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        </div>
    `).join('');
}

function toggleCart(open = null) {
    const drawer = document.getElementById('cartDrawer');
    const backdrop = document.getElementById('cartBackdrop');
    const panel = document.getElementById('cartPanel');

    const isOpening = open !== null ? open : drawer.classList.contains('invisible');

    if (isOpening) {
        drawer.classList.remove('invisible');
        setTimeout(() => {
            backdrop.classList.remove('opacity-0');
            panel.classList.remove('-translate-x-full');
        }, 10);
    } else {
        backdrop.classList.add('opacity-0');
        panel.classList.add('-translate-x-full');
        setTimeout(() => {
            drawer.classList.add('invisible');
        }, 300);
    }
}

function openProductModal(productId) {
    const product = perfumes.find(p => p.id === productId);
    const content = document.getElementById('modalContent');

    content.innerHTML = `
        <div class="w-full md:w-1/2 h-64 md:h-auto relative">
            <img src="${product.image}" alt="${product.name}" onerror="this.onerror=null;this.src=\'images/placeholder.svg\'" class="w-full h-full object-cover">
        </div>
        <div class="w-full md:w-1/2 p-6 flex flex-col justify-between">
            <div>
                <span class="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full uppercase border border-amber-200/60 inline-block mb-2">عطر فاخر</span>
                <h3 class="text-2xl font-bold text-stone-900">${product.name}</h3>
                <p class="text-amber-800 font-bold text-2xl mt-2">${product.price} <span class="text-sm text-stone-500 font-normal">ر.س</span></p>
                <p class="text-stone-600 text-sm mt-4 leading-relaxed">${product.description}</p>
                <div class="mt-4 p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <span class="text-xs font-bold text-stone-700 block mb-1">النوتات العطرية الأساسية:</span>
                    <span class="text-xs text-stone-500 leading-normal">${product.notes}</span>
                </div>
            </div>
            <div class="mt-6">
                <button onclick="addToCart(${product.id}); closeProductModal();" class="w-full bg-stone-900 hover:bg-amber-800 text-white font-bold py-3.5 rounded-xl transition shadow-lg">
                    إضافة إلى السلة
                </button>
            </div>
        </div>
    `;

    document.getElementById('productModal').classList.remove('hidden');
}

function closeProductModal() {
    document.getElementById('productModal').classList.add('hidden');
}

function openQuiz() {
    document.getElementById('quizModal').classList.remove('hidden');
}

function closeQuiz() {
    document.getElementById('quizModal').classList.add('hidden');
}

function recommendPerfume(cat) {
    closeQuiz();
    filterCategory(cat);
    document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
}

function checkout() {
    if(cart.length === 0) {
        // Show floating warning notification instead of alert()
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-amber-300 px-6 py-3 rounded-full text-sm font-bold shadow-xl border border-amber-500/30 transition-all duration-300 opacity-0';
        toast.innerText = 'السلة فارغة! قم بإضافة عطور أولاً.';
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.remove('opacity-0'), 10);
        setTimeout(() => {
            toast.classList.add('opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 2500);
        return;
    }

    // Successful checkout notification
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-amber-800 text-white px-6 py-3 rounded-full text-sm font-bold shadow-xl transition-all duration-300 opacity-0';
    toast.innerText = 'شكراً لك! تم استلام طلبك بنجاح ✨';
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.remove('opacity-0'), 10);
    setTimeout(() => {
        toast.classList.add('opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);

    cart = [];
    updateCartUI();
    toggleCart(false);
}
