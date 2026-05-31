// js/db.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
// set yerine update metodunu import ediyoruz
import { getDatabase, ref, update, get, child } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ============================================================================
// 1. FİREBASE YAPILANDIRMASI VE BAŞLATMA
// ============================================================================
const firebaseConfig = {
    apiKey: "AIzaSyDke-wWSE1w1AgQMf4-W8pG1x1jJxBY44c",
    authDomain: "kpsspro-e18db.firebaseapp.com",
    databaseURL: "https://kpsspro-e18db-default-rtdb.europe-west1.firebasedatabase.app", 
    projectId: "kpsspro-e18db",
    storageBucket: "kpsspro-e18db.firebasestorage.app",
    messagingSenderId: "443610578205",
    appId: "1:443610578205:web:0cd178d04e8cd11eb3b5f4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app); 
const database = getDatabase(app);

// ============================================================================
// 2. ÇEVRİMDIŞI DESTEKLİ KAYIT SİSTEMİ (Conflict Resolution ile)
// ============================================================================
export async function saveUserDataToDB(uid, data) {
    // 1. Her koşulda önce yerel cihaza (localStorage) yedekle
    localStorage.setItem(`kpss_offline_${uid}`, JSON.stringify(data));
    
    // 2. İnternet bağlantısı varsa Firebase'e gönder
    if (navigator.onLine) {
        try {
            const userRef = ref(database, 'users/' + uid);
            
            // Veri ezilmesini (Overwrite) önlemek için önce sunucudaki son güncellenme tarihini al
            const snapshot = await get(child(ref(database), `users/${uid}/lastUpdated`));
            const serverLastUpdated = snapshot.exists() ? snapshot.val() : 0;
            const clientLastUpdated = data.lastUpdated || 0;

            // Çatışma Çözümü: Eğer sunucudaki veri bizim göndereceğimizden daha yeniyse, üzerine yazma!
            if (serverLastUpdated > clientLastUpdated) {
                console.warn("Sunucudaki veri daha güncel. Veri ezilmesini önlemek için işlem iptal edildi.");
                return;
            }

            // OPTİMİZASYON: set() yerine update() kullanılarak tüm ağacı baştan yaratmak yerine
            // yalnızca mevcut/değişen düğümler güncellenir.
            await update(userRef, data);
            
        } catch (error) {
            console.error("Buluta kaydetme hatası (arka planda tekrar denenecek):", error);
        }
    }
}

// ============================================================================
// 3. ÇEVRİMDIŞI DESTEKLİ VERİ ÇEKME SİSTEMİ (Akıllı Senkronizasyon)
// ============================================================================
export async function loadUserDataFromDB(uid) {
    let serverData = null;
    let localData = null;

    // A. Önce cihazdaki yerel veriyi al
    const localRaw = localStorage.getItem(`kpss_offline_${uid}`);
    if (localRaw) {
        localData = JSON.parse(localRaw);
    }

    // B. İnternet varsa sunucudaki veriyi al
    if (navigator.onLine) {
        try {
            const dbRef = ref(database);
            const snapshot = await get(child(dbRef, `users/${uid}`));
            
            if (snapshot.exists()) {
                serverData = snapshot.val();
            }
        } catch (error) {
            console.warn("Buluttan veri çekilemedi, yerel veri kullanılacak...", error);
        }
    }

    // C. ÇATIŞMA ÇÖZÜMÜ (CONFLICT RESOLUTION) - Hangi veri daha güncel?
    if (serverData && localData) {
        const serverTime = serverData.lastUpdated || 0;
        const localTime = localData.lastUpdated || 0;

        if (serverTime > localTime) {
            // Sunucudaki veri daha güncel: Yereli güncelle ve sunucu verisini kullan
            localStorage.setItem(`kpss_offline_${uid}`, JSON.stringify(serverData));
            return serverData;
        } 
        else if (localTime > serverTime) {
            // Cihazdaki çevrimdışı veri daha yeni: Hemen sunucuya yolla ve yereli kullan
            saveUserDataToDB(uid, localData);
            return localData;
        } 
        else {
            // İkisi de aynıysa sunucuyu baz al
            return serverData;
        }
    }

    // D. Sadece sunucuda veri varsa (Başka cihazdan girilmişse vs.)
    if (serverData) {
        localStorage.setItem(`kpss_offline_${uid}`, JSON.stringify(serverData));
        return serverData;
    }
    
    // E. Sadece yerelde veri varsa (İlk kez çevrimdışı girilmişse)
    if (localData) {
        return localData;
    }

    // F. Hiçbir yerde veri yoksa yepyeni bir başlangıç
    return {};
}
