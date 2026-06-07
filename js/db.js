// js/db.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
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
    localStorage.setItem(`kpss_offline_${uid}`, JSON.stringify(data));
    
    if (navigator.onLine) {
        try {
            const userRef = ref(database, 'users/' + uid);
            
            const snapshot = await get(child(ref(database), `users/${uid}/lastUpdated`));
            const serverLastUpdated = snapshot.exists() ? snapshot.val() : 0;
            const clientLastUpdated = data.lastUpdated || 0;

            if (serverLastUpdated > clientLastUpdated) {
                console.warn("Sunucudaki veri daha güncel. Veri ezilmesini önlemek için işlem iptal edildi.");
                return;
            }

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

    const localRaw = localStorage.getItem(`kpss_offline_${uid}`);
    if (localRaw) {
        localData = JSON.parse(localRaw);
    }

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

    if (serverData && localData) {
        const serverTime = serverData.lastUpdated || 0;
        const localTime = localData.lastUpdated || 0;

        if (serverTime > localTime) {
            localStorage.setItem(`kpss_offline_${uid}`, JSON.stringify(serverData));
            return serverData;
        } 
        else if (localTime > serverTime) {
            saveUserDataToDB(uid, localData);
            return localData;
        } 
        else {
            return serverData;
        }
    }

    if (serverData) {
        localStorage.setItem(`kpss_offline_${uid}`, JSON.stringify(serverData));
        return serverData;
    }
    
    if (localData) {
        return localData;
    }

    return {};
}
