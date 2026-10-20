```javascript
// طبقة البيانات: كل التعامل مع Firebase هنا فقط

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';

import {
    getFirestore,
    collection,
    doc,
    addDoc,
    setDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp,
    writeBatch
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

import { firebaseConfig } from './config.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const rows = snapshot =>
    snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

// =====================================
// المنتجات
// =====================================

export const watchProducts = (ok, err) =>
    onSnapshot(collection(db, 'products'), snapshot => ok(rows(snapshot)), err);

export const saveProduct = (id, data) =>
    id
        ? setDoc(doc(db, 'products', id), data, { merge: true })
        : addDoc(collection(db, 'products'), {
            ...data,
            createdAt: serverTimestamp()
        });

export const removeProduct = id =>
    deleteDoc(doc(db, 'products', id));

export const seedProducts = list => {
    const batch = writeBatch(db);

    list.forEach(product => {
        batch.set(doc(collection(db, 'products')), {
            ...product,
            createdAt: serverTimestamp()
        });
    });

    return batch.commit();
};

// =====================================
// الطلبات
// =====================================

export const watchOrders = (ok, err) =>
    onSnapshot(
        query(collection(db, 'orders'), orderBy('createdAt', 'desc')),
        snapshot => ok(rows(snapshot)),
        err
    );

export const createOrder = order =>
    addDoc(collection(db, 'orders'), {
        ...order,
        createdAt: serverTimestamp()
    });

// =====================================
// تسجيل دخول الإدارة
// =====================================

export const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

export const logout = () =>
    signOut(auth);

export const onAuth = callback =>
    onAuthStateChanged(auth, callback);

// =====================================
// إعدادات المتجر
// =====================================

const STORE_SETTINGS_ID = 'main';

export const watchStoreSettings = (ok, err) =>
    onSnapshot(
        doc(db, 'storeSettings', STORE_SETTINGS_ID),
        snapshot => ok(
            snapshot.exists()
                ? { id: snapshot.id, ...snapshot.data() }
                : null
        ),
        err
    );

export const saveStoreSettings = data =>
    setDoc(
        doc(db, 'storeSettings', STORE_SETTINGS_ID),
        {
            ...data,
            updatedAt: serverTimestamp()
        },
        { merge: true }
    );

// =====================================
// البنرات الإعلانية
// =====================================

export const watchBanners = (ok, err) =>
    onSnapshot(
        query(collection(db, 'banners'), orderBy('position', 'asc')),
        snapshot => ok(rows(snapshot)),
        err
    );

export const saveBanner = (id, data) =>
    id
        ? setDoc(
            doc(db, 'banners', id),
            {
                ...data,
                updatedAt: serverTimestamp()
            },
            { merge: true }
        )
        : addDoc(collection(db, 'banners'), {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

export const removeBanner = id =>
    deleteDoc(doc(db, 'banners', id));
```
