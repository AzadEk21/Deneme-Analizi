// js/auth.js

import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut, 
    sendPasswordResetEmail 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { auth } from "./db.js";
import { initUserApp, clearUserApp } from "./app.js";

// ============================================================================
// 1. DOM ELEMENTLERİ
// ============================================================================
const authScreen = document.getElementById('authScreen');
const appScreen = document.getElementById('appScreen');
const loginBox = document.getElementById('loginBox');
const registerBox = document.getElementById('registerBox');

const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const registerEmail = document.getElementById('registerEmail');
const registerPassword = document.getElementById('registerPassword');

const loginMessage = document.getElementById('loginMessage');
const registerMessage = document.getElementById('registerMessage');

const resetBox = document.getElementById('resetBox');
const resetEmail = document.getElementById('resetEmail');
const resetMessage = document.getElementById('resetMessage');

// ============================================================================
// 2. EKRAN GEÇİŞLERİ
// ============================================================================
document.getElementById('showRegisterBtn').addEventListener('click', (e) => { 
    e.preventDefault(); 
    loginBox.classList.add('d-none'); 
    registerBox.classList.remove('d-none'); 
});

document.getElementById('showLoginBtn').addEventListener('click', (e) => { 
    e.preventDefault(); 
    registerBox.classList.add('d-none'); 
    loginBox.classList.remove('d-none'); 
});

document.getElementById('forgotPasswordLink').addEventListener('click', (e) => {
    e.preventDefault();
    loginBox.classList.add('d-none');
    resetBox.classList.remove('d-none');
});

document.getElementById('backToLoginBtn').addEventListener('click', (e) => {
    e.preventDefault();
    resetBox.classList.add('d-none');
    loginBox.classList.remove('d-none');
});

// ============================================================================
// 3. KİMLİK DOĞRULAMA (AUTH) İŞLEMLERİ
// ============================================================================

// Şifre Sıfırlama
document.getElementById('resetBtn').addEventListener('click', async () => {
    const email = resetEmail.value.trim();
    if(!email) return showMsg(resetMessage, "Lütfen e-posta adresinizi girin.");
    
    try {
        await sendPasswordResetEmail(auth, email);
        showMsg(resetMessage, "Sıfırlama bağlantısı gönderildi! Lütfen e-postanızı kontrol edin.", "var(--success-color)");
        resetEmail.value = ''; 
    } catch(error) {
        showMsg(resetMessage, "Hata: " + errorCodeToMessage(error.code));
    }
});

// Kayıt Ol
document.getElementById('registerBtn').addEventListener('click', async () => {
    const email = registerEmail.value.trim(); 
    const password = registerPassword.value.trim();
    
    if (!email || !password) return showMsg(registerMessage, "E-posta ve şifre boş bırakılamaz.");
    
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        registerEmail.value = '';
        registerPassword.value = '';
    } catch (error) {
        showMsg(registerMessage, "Kayıt Hatası: " + errorCodeToMessage(error.code));
    }
});

// Giriş Yap
document.getElementById('loginBtn').addEventListener('click', async () => {
    const email = loginEmail.value.trim(); 
    const password = loginPassword.value.trim();
    
    if (!email || !password) return showMsg(loginMessage, "E-posta ve şifre boş bırakılamaz.");
    
    try { 
        await signInWithEmailAndPassword(auth, email, password); 
    } catch (error) { 
        showMsg(loginMessage, "Giriş Hatası: " + errorCodeToMessage(error.code)); 
    }
});

// Çıkış Yap
document.getElementById('logoutBtn').addEventListener('click', async () => { 
    await signOut(auth); 
});

// ============================================================================
// 4. OTURUM DURUMU DİNLEYİCİSİ (AUTH STATE OBSERVER)
// ============================================================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        authScreen.classList.add('d-none'); 
        appScreen.classList.remove('d-none');
        document.getElementById('userEmailDisplay').textContent = user.email;
        initUserApp(user.uid);
    } else {
        appScreen.classList.add('d-none'); 
        authScreen.classList.remove('d-none');
        
        loginBox.classList.remove('d-none'); 
        registerBox.classList.add('d-none');
        resetBox.classList.add('d-none');
        
        loginPassword.value = ''; 
        document.getElementById('userEmailDisplay').textContent = '';
        
        clearUserApp();
    }
});

// ============================================================================
// 5. YARDIMCI FONKSİYONLAR VE HATA YAKALAMA
// ============================================================================
function showMsg(el, msg, color = "var(--alert-color)") {
    el.style.color = color; 
    el.textContent = msg; 
    setTimeout(() => { el.textContent = ''; }, 4000);
}

function errorCodeToMessage(code) {
    switch (code) {
        case 'auth/email-already-in-use': return "Bu e-posta zaten kayıtlı.";
        case 'auth/invalid-email': return "Geçersiz e-posta formatı.";
        case 'auth/weak-password': return "Şifre en az 6 karakter olmalıdır.";
        case 'auth/user-not-found': return "Kullanıcı bulunamadı.";
        case 'auth/wrong-password': return "Hatalı şifre girdiniz.";
        case 'auth/invalid-credential': return "E-posta veya şifre hatalı.";
        default: return "İşlem başarısız, lütfen tekrar deneyin.";
    }
}
