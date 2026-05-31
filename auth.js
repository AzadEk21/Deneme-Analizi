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

// ============================================================================
// 3. ŞİFRE SIFIRLAMA (PASSWORD RESET)
// ============================================================================
document.getElementById('forgotPasswordLink').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = prompt("Şifre sıfırlama bağlantısı için kayıtlı e-posta adresinizi giriniz:");
    
    if(email) {
        try {
            await sendPasswordResetEmail(auth, email);
            showMsg(loginMessage, "Şifre sıfırlama bağlantısı gönderildi! Lütfen e-postanızı kontrol edin.", "var(--success-color)");
        } catch(error) {
            showMsg(loginMessage, "Hata: " + errorCodeToMessage(error.code));
        }
    }
});

// ============================================================================
// 4. KAYIT OL (GÜNCELLENMİŞ VE OPTİMİZE EDİLMİŞ AKIŞ)
// ============================================================================
// isRegistering bayrağı ve manuel signOut kaldırıldı. Firebase'in doğal akışı kullanıldı.
document.getElementById('registerBtn').addEventListener('click', async () => {
    const email = registerEmail.value.trim(); 
    const password = registerPassword.value.trim();
    
    if (!email || !password) {
        return showMsg(registerMessage, "E-posta ve şifre boş bırakılamaz.");
    }
    
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        // Kayıt başarılı olduğunda Firebase otomatik olarak oturum açar 
        // ve onAuthStateChanged tetiklenerek ana ekrana pürüzsüz geçiş sağlanır.
        
        // Güvenlik için formu temizle
        registerEmail.value = '';
        registerPassword.value = '';
    } catch (error) {
        showMsg(registerMessage, "Kayıt Hatası: " + errorCodeToMessage(error.code));
    }
});

// ============================================================================
// 5. GİRİŞ YAP (LOGIN)
// ============================================================================
document.getElementById('loginBtn').addEventListener('click', async () => {
    const email = loginEmail.value.trim(); 
    const password = loginPassword.value.trim();
    
    if (!email || !password) {
        return showMsg(loginMessage, "E-posta ve şifre boş bırakılamaz.");
    }
    
    try { 
        await signInWithEmailAndPassword(auth, email, password); 
    } catch (error) { 
        showMsg(loginMessage, "Giriş Hatası: " + errorCodeToMessage(error.code)); 
    }
});

// ============================================================================
// 6. ÇIKIŞ YAP (LOGOUT)
// ============================================================================
document.getElementById('logoutBtn').addEventListener('click', async () => { 
    await signOut(auth); 
});

// ============================================================================
// 7. OTURUM DURUMU DİNLEYİCİSİ (AUTH STATE OBSERVER)
// ============================================================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Kullanıcı giriş yaptıysa
        authScreen.classList.add('d-none'); 
        appScreen.classList.remove('d-none');
        document.getElementById('userEmailDisplay').textContent = user.email;
        
        // Uygulamayı başlat ve veritabanı bağlantısını kur
        initUserApp(user.uid);
    } else {
        // Çıkış yapıldıysa veya henüz girilmediyse
        appScreen.classList.add('d-none'); 
        authScreen.classList.remove('d-none');
        
        // Her zaman giriş kutusunu varsayılan olarak göster
        loginBox.classList.remove('d-none'); 
        registerBox.classList.add('d-none');
        
        // Güvenlik için inputları temizle
        loginPassword.value = ''; 
        document.getElementById('userEmailDisplay').textContent = '';
        
        // Uygulama verilerini DOM'dan temizle
        clearUserApp();
    }
});

// ============================================================================
// 8. YARDIMCI FONKSİYONLAR VE HATA YAKALAMA
// ============================================================================
function showMsg(el, msg, color = "var(--alert-color)") {
    el.style.color = color; 
    // XSS Güvenliği için innerHTML yerine textContent kullanılıyor
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
        default: return "Giriş yapılamadı, lütfen tekrar deneyin.";
    }
}