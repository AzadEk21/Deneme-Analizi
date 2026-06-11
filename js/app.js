import { saveUserDataToDB, loadUserDataFromDB, auth } from './db.js';
import { updatePassword, deleteUser } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ============================================================================
// 1. MÜFREDAT VE SABİTLER
// ============================================================================
const SORU_LIMITLERI = { "Türkçe": 30, "Matematik": 30, "Tarih": 27, "Coğrafya": 18, "Vatandaşlık": 15 };

const müfredat = {
    "Türkçe": [
        "Ses Bilgisi", "Yazım Kuralları", "Noktalama İşaretleri", "Sözcükte Yapı", 
        "Sözcük Türleri", "Zamirler", "Zarflar", "Edat ve Bağlaçlar", "Fiiller", 
        "Fiilimsiler", "Fiilde Çatı", "Cümlenin Öğeleri", "Cümle Türleri", 
        "Anlatım Bozuklukları", "Sözcükte Anlam", "Cümlede Anlam", "Paragrafta Anlam", 
        "Sözel Mantık"
    ],
    "Matematik": [
        "Temel Kavramlar", "Tek ve Çift Sayılar", "Asal Sayılar", "Faktöriyel", 
        "Ardışık Sayılar", "Sayı Basamakları", "Bölme ve Bölünebilme", "Asal Çarpanlar", 
        "Ebob - Ekok", "Rasyonel Sayılar", "Ondalıklı Sayılar", "Basit Eşitsizlik", 
        "Mutlak Değer", "Üslü Sayılar", "Köklü Sayılar", "Çarpanlara Ayırma", 
        "Oran - Orantı", "Sayı ve Kesir Problemleri", "Yaş Problemleri", "Karışım Problemleri", 
        "İşçi ve Havuz Problemleri", "Yüzde - Kar - Zarar - Faiz Problemleri", "Hareket - Hız Problemleri", 
        "Grafik Problemleri", "Kümeler ve Problemleri", "İşlem ve Modüler Aritmetik", 
        "Permütasyon - Kombinasyon ve Olasılık", "Fonksiyonlar", "Sayısal Mantık",
        "Geometri - Açılar", "Geometri - Üçgenler", "Geometri - Çokgenler ve Dörtgenler", 
        "Geometri - Çember ve Daire", "Geometri - Analitik Geometri", "Geometri - Katı Cisimler"
    ],
    "Tarih": [
        "İslamiyet Öncesi Türk Tarihi - İlk ve Orta Çağda Türk Dünyası", 
        "İslamiyet Öncesi Türk Devletlerinde Kültür ve Uygarlık", 
        "İlk Türk İslam Devletleri - Türklerin İslamiyet’i Kabulü", 
        "İlk Türk - İslam Devletlerinde Kültür ve Uygarlık", 
        "Anadolu - Türkiye Selçuklu Devleti", 
        "Anadolu Selçuklu Devleti Kültür ve Uygarlık", 
        "Osmanlı Devleti Kuruluş Dönemi - Osmanlı Beylikten Devlete Geçiş", 
        "Osmanlı Devleti Yükselme Dönemi - Dünya Gücü Osmanlı", 
        "XVII. Yüzyıl Osmanlı Devleti Duraklama Dönemi ", 
        "XVIII. Yüzyıl Osmanlı Devleti Gerileme Dönemi ", 
        "XIX. Yüzyıl Osmanlı Devleti Dağılma Dönemi", 
        "Osmanlı Devleti Kültür ve Uygarlık",
        "1. Dünya Savaşı", 
        "Kurtuluş Savaşına Hazırlık Dönemi", 
        "Kurtuluş Savaşı Muharebeler ve Antlaşmalar",  
        "İnkılap Tarihi", 
        "Atatürk İlkeleri", 
        "Atatürk Dönemi Türk Dış Politikası", 
        "Çağdaş Türk ve Dünya Tarihi"
    ],
    "Coğrafya": [
        "Türkiye'nin Coğrafi Konumu", "Matematik (Mutlak) Konum", "Özel (Göreceli) Konum", 
        "Türkiye'nin Yerşekilleri", "Türkiye'nin Platoları ve Ovaları", "Dış Güçlerin Oluşturduğu Yerşekilleri", 
        "Türkiye'de Toprak Oluşumu ve Tipleri", "Türkiye'nin Su Varlığı", "Doğal Afetler", 
        "Türkiye'nin İklimi ve Bitki Örtüsü", "Türkiye'de Nüfus, Yerleşme ve Göç", 
        "Türkiye'de Tarım, Hayvancılık ve Orman", "Madenler ve Enerji Kaynakları", 
        "Ulaşım, Ticaret ve Turizm", "Türkiye'nin Coğrafi Bölgeleri"
    ],
    "Vatandaşlık": [
        "Hukukun Temel Kavramları", "Devlet Biçimleri Demokrasi", "Anayasa Hukukuna Giriş", 
        "1982 Anayasasının Temel İlkeleri", "Yasama", "Yürütme", "Yargı", 
        "Temel Hak Ve Hürriyetler", "İdare Hukuku-(Devlet Memurları Kanunu - DMK 657)", "Uluslararası Kuruluşlar", "Güncel Bilgiler"
    ]
};

// ============================================================================
// 2. GLOBAL DURUM (STATE) & MODÜL DEĞİŞKENLERİ
// ============================================================================
let db = {};
let currentUid = null;
let aktifDers = "Türkçe"; 
let aktifDenemeNo = 1; 
let aktifSekme = "ders"; 
let aktifGrafikFiltre = "Genel"; 
let aktifAnalizFiltresi = 3;
let aktifAnalizDersi = "Türkçe";
let aktifAramaTerimi = "";
let mevcutTema = localStorage.getItem('kpss_tema') || 'dark';

document.documentElement.setAttribute('data-theme', mevcutTema);
const tBtn = document.getElementById('themeBtn');
if (tBtn) {
    tBtn.innerHTML = mevcutTema === 'dark' ? '<i class="fas fa-sun"></i> Gündüz Modu' : '<i class="fas fa-moon"></i> Gece Modu';
}

// ============================================================================
// 3. YARDIMCI FONKSİYONLAR VE BİLDİRİMLER (UI)
// ============================================================================
function showToast(msg, type = "error") {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const toast = document.createElement('div'); 
    toast.className = `toast ${type}`; 
    
    let icon = type === "error" ? '<i class="fas fa-exclamation-circle"></i>' : 
               type === "warning" ? '<i class="fas fa-exclamation-triangle"></i>' :
               type === "success" ? '<i class="fas fa-check-circle"></i>' : 
               '<i class="fas fa-info-circle"></i>';
               
    toast.innerHTML = icon + ' <span></span>';
    toast.querySelector('span').textContent = msg;
    
    container.appendChild(toast);
    setTimeout(() => { 
        toast.classList.add('fade-out'); 
        setTimeout(() => toast.remove(), 300); 
    }, 3000);
}

function kaydet() { 
    if(currentUid) {
        db.lastUpdated = Date.now(); 
        saveUserDataToDB(currentUid, db); 
    }
}

// ============================================================================
// HAYALET VERİ (GHOST DATA) TEMİZLEYİCİSİ
// ============================================================================
function temizleHayaletVeriler() {
    let degisiklikYapildi = false;

    Object.keys(db).forEach(k => {
        if(k === 'lastUpdated') return;
        if(typeof db[k] === 'object') {
            Object.keys(db[k]).forEach(noStr => {
                let no = parseInt(noStr);
                if(isNaN(no) || no <= 0) {
                    delete db[k][noStr];
                    degisiklikYapildi = true;
                }
            });
        }
    });

    let dNolar = new Set();
    Object.keys(db).forEach(d => { 
        if(d !== 'meta' && d !== 'lastUpdated') {
            if(typeof db[d] === 'object') {
                Object.keys(db[d]).forEach(no => dNolar.add(parseInt(no)));
            }
        }
    });

    dNolar.forEach(no => {
        let tamamenBosMu = true;
        Object.keys(müfredat).forEach(ders => {
            if(db[ders] && db[ders][no]) {
                Object.keys(db[ders][no]).forEach(k => {
                    let data = db[ders][no][k];
                    if(data && (parseInt(data.d) > 0 || parseInt(data.y) > 0 || parseInt(data.b) > 0)) tamamenBosMu = false;
                });
            }
        });

        if(tamamenBosMu && !db.meta?.[no]?.tarih) {
            Object.keys(db).forEach(d => { if(db[d]?.[no]) delete db[d][no]; });
            degisiklikYapildi = true;
        }
    });

    if(degisiklikYapildi) saveUserDataToDB(currentUid, db); 
}

// ============================================================================
// 4. ÇEVRİMDIŞI / ÇEVRİMİÇİ AĞ YÖNETİMİ
// ============================================================================
window.addEventListener('online', () => { showToast("İnternet bağlantısı sağlandı. Veriler eşitleniyor...", "info"); kaydet(); });
window.addEventListener('offline', () => { showToast("İnternet koptu. Veriler cihaza kaydediliyor.", "warning"); });

// ============================================================================
// 5. BAŞLATMA (INIT) VE TEMİZLEME
// ============================================================================
export async function initUserApp(uid) {
    currentUid = uid; 
    showToast("Verileriniz yükleniyor...", "info");
    
    try {
        const userData = await loadUserDataFromDB(uid); 
        db = userData || {};
        if(!db.meta) db.meta = {};
        
        temizleHayaletVeriler();
        
        const savedGy = localStorage.getItem(`gy_target_${uid}`); 
        const savedGk = localStorage.getItem(`gk_target_${uid}`);
        if(savedGy) document.getElementById("gy-target").value = savedGy; 
        if(savedGk) document.getElementById("gk-target").value = savedGk;
        
        renderNav(); 
        gosterSekme(); 
        showToast("Veriler başarıyla yüklendi!", "success");
    } catch (error) { showToast("Veri çekme hatası.", "error"); }
}

export function clearUserApp() { 
    currentUid = null; db = {}; document.getElementById('mainContent').innerHTML = ''; 
}

// ============================================================================
// 6. EVENT LISTENER'LAR (PWA, Profil ve Diğerleri)
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').then(() => {
            console.log('PWA Service Worker Aktif.');
        }).catch(err => console.log('SW Kayıt Hatası:', err));
    }

    document.getElementById('themeBtn')?.addEventListener('click', () => {
        mevcutTema = mevcutTema === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', mevcutTema);
        localStorage.setItem('kpss_tema', mevcutTema);
        document.getElementById('themeBtn').innerHTML = mevcutTema === 'dark' ? '<i class="fas fa-sun"></i> Gündüz Modu' : '<i class="fas fa-moon"></i> Gece Modu';
        if(aktifSekme === "grafik") cizGrafik();
    });

    document.getElementById('btnSifreGuncelle')?.addEventListener('click', async () => {
        const yeniSifre = document.getElementById('profilYeniSifre').value;
        if(yeniSifre.length < 6) return showToast("Şifre en az 6 karakter olmalıdır.", "warning");
        try {
            await updatePassword(auth.currentUser, yeniSifre);
            showToast("Şifreniz başarıyla güncellendi!", "success");
            document.getElementById('profilYeniSifre').value = '';
        } catch(error) {
            showToast("Güvenlik nedeniyle lütfen çıkış yapıp tekrar girdikten sonra deneyin.", "error");
        }
    });

    // Hesap Silme Modalı Açma
    document.getElementById('btnHesapSil')?.addEventListener('click', () => {
        document.getElementById('hesapSilModal').style.display = 'flex';
    });

    // Hesap Silme Modalı İptal
    document.getElementById('cancelHesapSilBtn')?.addEventListener('click', () => {
        document.getElementById('hesapSilModal').style.display = 'none';
    });

    // Hesap Silme Modalı Onay (Silme İşlemi)
    document.getElementById('confirmHesapSilBtn')?.addEventListener('click', async () => {
        try {
            document.getElementById('hesapSilModal').style.display = 'none';
            showToast("Hesap siliniyor...", "warning");
            
            await saveUserDataToDB(currentUid, null); // Verileri sil
            await deleteUser(auth.currentUser);       // Hesabı sil
            showToast("Hesabınız ve verileriniz tamamen silindi.", "info");
        } catch(error) {
            showToast("Güvenlik nedeniyle lütfen çıkış yapıp tekrar girdikten sonra silmeyi deneyin.", "error");
        }
    });

    document.getElementById('saveTargetsBtn')?.addEventListener('click', () => {
        const gy = document.getElementById("gy-target").value; 
        const gk = document.getElementById("gk-target").value;
        if(!gy || !gk) return showToast("Hedefleri eksiksiz girin.", "error");
        
        localStorage.setItem(`gy_target_${currentUid}`, gy); 
        localStorage.setItem(`gk_target_${currentUid}`, gk);
        showToast("Hedefler kaydedildi!", "success"); 
        if(aktifSekme === "grafik") cizGrafik();
    });

    document.getElementById('calcResultsBtn')?.addEventListener('click', () => {
        const dNo = parseInt(document.getElementById("hedefDenemeNo").value);
        if(!dNo) return showToast("Deneme No giriniz.", "error");
        
        const gyTarget = parseFloat(document.getElementById("gy-target").value) || 0;
        const gkTarget = parseFloat(document.getElementById("gk-target").value) || 0;
        
        if(gyTarget === 0 || gkTarget === 0) return showToast("Önce hedeflerinizi kaydedin.", "error");

        let gyCurrent = 0, gkCurrent = 0;
        
        Object.keys(müfredat).forEach(ders => {
            let n = 0; 
            müfredat[ders].forEach(k => { 
                let data = db[ders]?.[dNo]?.[k];
                if (!data || data.s !== false) { 
                    let d = data?.d || 0; let y = data?.y || 0; 
                    n += (d - (y / 4)); 
                }
            });
            if(ders === "Türkçe" || ders === "Matematik") gyCurrent += n; else gkCurrent += n;
        });

        const gyPerc = Math.min(100, Math.max(0, (gyCurrent / gyTarget) * 100)).toFixed(1);
        const gkPerc = Math.min(100, Math.max(0, (gkCurrent / gkTarget) * 100)).toFixed(1);
        const totalTarget = gyTarget + gkTarget; 
        const totalCurrent = gyCurrent + gkCurrent;
        const totalPerc = ((totalCurrent / totalTarget) * 100).toFixed(1);

        let evalText = totalPerc >= 100 ? "🏆 Muazzam! Şampiyonlar ligindesin!" :
                       totalPerc >= 75 ? "⭐ Harika İlerliyorsun! Kalan netleri toplamak için nokta atışı çalış." :
                       "📈 İyi Bir Temelin Var. Eksik kapama kampları yapmalısın.";

        const resArea = document.getElementById("result-area");
        resArea.innerHTML = `
            <div class="result-card">
                <strong>Genel Yetenek:</strong> %${gyPerc} (Hedefe kalan: <strong>${Math.max(0, gyTarget-gyCurrent).toFixed(2)} net</strong>) 
                <div class="progress-bar"><div class="progress-fill" style="width: ${gyPerc}%;"></div></div>
            </div>
            <div class="result-card">
                <strong>Genel Kültür:</strong> %${gkPerc} (Hedefe kalan: <strong>${Math.max(0, gkTarget-gkCurrent).toFixed(2)} net</strong>) 
                <div class="progress-bar"><div class="progress-fill" style="width: ${gkPerc}%;"></div></div>
            </div>
            <div class="result-card" style="border-color:var(--primary-color);">
                <div class="mb-5 fs-18">
                    <strong>Toplam Durum:</strong> ${totalCurrent.toFixed(2)} / ${totalTarget.toFixed(2)} Net 
                    <span style="float:right; color:var(--primary-color); font-weight:bold;">%${totalPerc}</span>
                </div>
                <div class="progress-bar" style="height:12px;">
                    <div class="progress-fill" style="width: ${totalPerc}%; background-color: var(--primary-color);"></div>
                </div>
                <div class="evaluation-text"></div>
            </div>`;
        
        resArea.querySelector('.evaluation-text').textContent = evalText;
        resArea.classList.remove('d-none');
    });

    // ============================================================================
    // YENİ: YAPAY ZEKA İÇİN AKILLI RAPOR ÜRETİCİ (PROMPT GENERATOR - PRO VERSİYON)
    // ============================================================================
    document.getElementById('btnAiReport')?.addEventListener('click', () => {
        let denemeNolar = new Set(); 
        Object.keys(db).forEach(d => { if(d !== 'meta' && d !== 'lastUpdated') Object.keys(db[d]).forEach(no => denemeNolar.add(parseInt(no))); });
        
        let sirali = Array.from(denemeNolar).sort((a,b) => a-b); 
        if(sirali.length === 0) return showToast("Rapor oluşturmak için en az 1 deneme girmelisiniz.", "error");

        let analizEdilecekler = aktifAnalizFiltresi === 0 ? sirali : sirali.slice(-aktifAnalizFiltresi);
        let zamanAraligiMetni = aktifAnalizFiltresi === 0 ? "Tüm deneme geçmişime" : `Son ${aktifAnalizFiltresi} denememe`;

        // 1. Makro Verileri Hesapla (Ortalama Netler, Süre ve Hedefler)
        let toplamSure = 0, sureGirilenDeneme = 0;
        let dersNetleri = { "Türkçe": 0, "Matematik": 0, "Tarih": 0, "Coğrafya": 0, "Vatandaşlık": 0 };
        
        analizEdilecekler.forEach(dNo => {
            if(db.meta?.[dNo]?.sure && parseInt(db.meta[dNo].sure) > 0) {
                toplamSure += parseInt(db.meta[dNo].sure);
                sureGirilenDeneme++;
            }
            Object.keys(müfredat).forEach(ders => {
                let dN = 0;
                müfredat[ders].forEach(k => {
                    let data = db[ders]?.[dNo]?.[k];
                    if(!data || data.s !== false) { dN += ((data?.d || 0) - ((data?.y || 0) / 4)); }
                });
                dersNetleri[ders] += dN;
            });
        });

        let ortSure = sureGirilenDeneme > 0 ? Math.round(toplamSure / sureGirilenDeneme) : "Belirtilmemiş";
        let denemeSayisi = analizEdilecekler.length;
        
        let ortGY = ((dersNetleri["Türkçe"] + dersNetleri["Matematik"]) / denemeSayisi).toFixed(2);
        let ortGK = ((dersNetleri["Tarih"] + dersNetleri["Coğrafya"] + dersNetleri["Vatandaşlık"]) / denemeSayisi).toFixed(2);
        
        // Hedefleri çek
        let hedefGY = localStorage.getItem(`gy_target_${currentUid}`) || "Belirtilmedi";
        let hedefGK = localStorage.getItem(`gk_target_${currentUid}`) || "Belirtilmedi";

        // Prompt Başlangıcı (Makro Analiz)
        let prompt = `Merhaba, ben KPSS Lisans sınavına hazırlanan bir öğrenciyim. Bir yapay zeka eğitim koçu ve veri bilimci olarak aşağıdaki verilerimi analiz etmeni ve bana stratejik bir yol haritası çizmeni istiyorum.\n\n`;
        
        prompt += `📊 [GENEL DURUM ÖZETİM - ${zamanAraligiMetni} Göre]\n`;
        prompt += `- Genel Yetenek (GY) Ortalamam: ${ortGY} Net (Hedefim: ${hedefGY} Net)\n`;
        prompt += `- Genel Kültür (GK) Ortalamam: ${ortGK} Net (Hedefim: ${hedefGK} Net)\n`;
        prompt += `- Ortalama Sınav Tamamlama Sürem: ${ortSure} Dakika (KPSS Lisans normal süresi 130 dakikadır)\n\n`;
        prompt += `Aşağıda ders bazlı ortalama netlerim ve konu bazlı yüzdelik başarı oranlarım (yanlarında trend durumu) bulunmaktadır:\n\n`;

        // 2. Mikro Verileri Hesapla (Ders ve Konu Detayları)
        Object.keys(müfredat).forEach(ders => {
            let zayif = [], orta = [], iyi = [], korNokta = [];
            let dersOrtalamaNet = (dersNetleri[ders] / denemeSayisi).toFixed(2);
            
            müfredat[ders].forEach(k => {
                let yS = 0, dS = 0, bS = 0, sS = 0; 
                let dIlk = 0, yIlk = 0, bIlk = 0; let dSon = 0, ySon = 0, bSon = 0;
                let mid = Math.floor(analizEdilecekler.length / 2);
                let dC = false;

                analizEdilecekler.forEach((dNo, i) => {
                    if (!db[ders] || !db[ders][dNo]) return; 
                    let data = db[ders][dNo][k]; let s = data === undefined ? true : data.s;
                    if(s) { 
                        dC = true; sS++; 
                        let d = Number(data?.d || 0); let y = Number(data?.y || 0); let b = Number(data?.b || 0); 
                        bS += b; yS += y; dS += d; 
                        if(i < mid) { dIlk += d; yIlk += y; bIlk += b; } else { dSon += d; ySon += y; bSon += b; } 
                    }
                });

                if(!dC) {
                    korNokta.push(k);
                } else {
                    let toplamSorulan = dS + yS + bS;
                    if(sS > 0 && toplamSorulan > 0) {
                        let isabet = (dS / toplamSorulan) * 100;
                        
                        let trendMetni = "";
                        let toplamIlk = dIlk + yIlk + bIlk; let toplamSon = dSon + ySon + bSon;
                        if(analizEdilecekler.length >= 2 && toplamIlk > 0 && toplamSon > 0) { 
                            let ortIlk = (dIlk / toplamIlk) * 100; let ortSon = (dSon / toplamSon) * 100;
                            if(ortSon > ortIlk) trendMetni = " 📈 Yükselişte"; 
                            else if(ortSon < ortIlk) trendMetni = " 📉 Düşüşte"; 
                        }

                        let konuOzeti = `${k} (%${isabet.toFixed(0)}${trendMetni})`;
                        if(isabet < 50) zayif.push(konuOzeti);
                        else if(isabet < 85) orta.push(konuOzeti);
                        else iyi.push(konuOzeti);
                    }
                }
            });

            if(zayif.length > 0 || orta.length > 0 || iyi.length > 0) {
                prompt += `📘 [${ders.toUpperCase()}] - Ortalama: ${dersOrtalamaNet} Net\n`;
                if(zayif.length > 0) prompt += `🔴 Zayıf/Kayıp Yaşanan Konular: ${zayif.join(', ')}\n`;
                if(orta.length > 0) prompt += `🟡 Pratik İsteyen Konular: ${orta.join(', ')}\n`;
                if(iyi.length > 0) prompt += `🟢 Güçlü Olunan Konular: ${iyi.join(', ')}\n`;
                if(korNokta.length > 0) prompt += `⚠️ Hiç Soru Çözülmeyen/Boş Bırakılanlar: ${korNokta.join(', ')}\n`;
                prompt += `\n`;
            }
        });

        prompt += `📌 GÖREVLERİN:\n`;
        prompt += `1. Zaman Yönetimi: Ortalama süremi KPSS gerçek sınav süresine (130 dk) göre değerlendir ve turlama/hızlanma taktikleri ver.\n`;
        prompt += `2. Hedef Analizi: GY ve GK'de hedeflerime ne kadar uzak olduğumu söyleyip gerçekçi bir tablo çiz.\n`;
        prompt += `3. Nokta Atışı Çalışma Programı: Ortalama neti düşük olan derslerime öncelik vererek önümüzdeki hafta için 'zayıf' ve 'düşüşte' olan konulardan hangilerini kesinlikle eritmem gerektiğini bana adım adım listele.\n`;

        navigator.clipboard.writeText(prompt).then(() => {
            showToast("YZ Raporu kopyalandı! ChatGPT veya Gemini'a yapıştırabilirsiniz.", "success");
        }).catch(err => {
            showToast("Kopyalama başarısız oldu. Tarayıcı izinlerini kontrol edin.", "error");
        });
    });

    document.addEventListener('click', (e) => {
        // Tıklanan buton veya butonun içindeki ikon ise
        if (e.target.closest('#helpBtn')) {
            e.preventDefault();
            const modal = document.getElementById('helpModal');
            if (modal) {
                modal.style.display = 'flex';
            }
        }
    });

    document.getElementById('closeHelpBtn')?.addEventListener('click', () => { document.getElementById('helpModal').style.display = 'none'; });
    document.getElementById('cancelDeleteBtn')?.addEventListener('click', () => { document.getElementById('silModal').style.display = 'none'; });

    document.getElementById('confirmDeleteBtn')?.addEventListener('click', () => {
        let silinenNo = aktifDenemeNo; 
        Object.keys(db).forEach(d => { if(db[d]?.[silinenNo]) delete db[d][silinenNo]; });
        if(db.meta?.[silinenNo]) delete db.meta[silinenNo]; 
        
        aktifDenemeNo = Math.max(1, silinenNo - 1);
        kaydet(); renderPanel(); 
        document.getElementById('silModal').style.display = 'none'; 
        showToast(`${silinenNo}. Deneme tamamen silindi.`, "success");
    });

    document.getElementById('exportCsvBtn')?.addEventListener('click', raporIndirCSV);
    document.getElementById('printPdfBtn')?.addEventListener('click', () => window.print());
    window.addEventListener('resize', () => { if(aktifSekme === "grafik") cizGrafik(); });
});

// ============================================================================
// 7. NAVİGASYON (SEKMELER) YÖNETİMİ
// ============================================================================
function renderNav() {
    const nav = document.getElementById('dersNav'); 
    nav.innerHTML = '';
    
    Object.keys(müfredat).forEach(ders => {
        const btn = document.createElement('button'); btn.textContent = ders;
        if(ders === aktifDers && aktifSekme === "ders") btn.className = 'active';
        btn.addEventListener('click', () => { 
            aktifDers = ders; aktifSekme = "ders"; aktifAramaTerimi = ""; renderNav(); gosterSekme(); 
        });
        nav.appendChild(btn);
    });
    
    const paneller = [ 
        { id: 'analiz', text: 'Analiz & Trend', cls: 'btn-analiz', icon: 'fa-chart-pie' }, 
        { id: 'hedef', text: 'Hedef & Geçmiş', cls: 'btn-hedef', icon: 'fa-bullseye' }, 
        { id: 'grafik', text: 'Grafik', cls: 'btn-grafik', icon: 'fa-chart-area' },
        { id: 'profil', text: 'Profil', cls: 'btn-info', icon: 'fa-user-cog' }
    ];
    
    paneller.forEach(p => {
        const btn = document.createElement('button'); 
        btn.innerHTML = `<i class="fas ${p.icon}"></i> ${p.text}`; 
        btn.className = `${p.cls} ${aktifSekme === p.id ? "active" : ""}`;
        btn.addEventListener('click', () => { 
            aktifSekme = p.id; aktifAramaTerimi = ""; renderNav(); gosterSekme(); 
        });
        nav.appendChild(btn);
    });
}

function gosterSekme() {
    ['mainContent', 'eksikPanel', 'hedefPanel', 'grafikPanel', 'profilPanel'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.display = "none";
    });
    
    if(aktifSekme === "ders") { document.getElementById('mainContent').style.display = "block"; renderPanel(); }
    else if(aktifSekme === "analiz") { 
        document.getElementById('eksikPanel').style.display = "block"; 
        const dersFiltreKutusu = document.getElementById('analizDersFiltreler');
        dersFiltreKutusu.innerHTML = '';
        Object.keys(müfredat).forEach(d => {
            const btn = document.createElement('button');
            btn.className = `pill-btn ${aktifAnalizDersi === d ? 'active' : ''}`; btn.textContent = d;
            btn.addEventListener('click', () => {
                aktifAnalizDersi = d;
                dersFiltreKutusu.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active'); analizEt();
            });
            dersFiltreKutusu.appendChild(btn);
        });

        document.querySelectorAll('#analizFiltreler .pill-btn').forEach(btn => { btn.replaceWith(btn.cloneNode(true)); });
        document.querySelectorAll('#analizFiltreler .pill-btn').forEach(btn => {
            btn.addEventListener('click', (e) => { 
                aktifAnalizFiltresi = parseInt(e.target.getAttribute('data-filter')); 
                document.querySelectorAll('#analizFiltreler .pill-btn').forEach(b => b.classList.remove('active')); 
                e.target.classList.add('active'); analizEt(); 
            });
        });
        analizEt(); 
    }
    else if(aktifSekme === "hedef") { 
        document.getElementById('hedefPanel').style.display = "block"; 
        let dNolar = Object.keys(db).filter(k => k !== 'meta' && k !== 'lastUpdated').flatMap(d => Object.keys(db[d]||{})).map(Number);
        document.getElementById('hedefDenemeNo').value = dNolar.length ? Math.max(...dNolar) : 1; 
        listeleGecmis(); runAIPrediction(); 
    }
    else if(aktifSekme === "grafik") { 
        document.getElementById('grafikPanel').style.display = "block"; 
        const c = document.getElementById('grafikFiltreler'); c.innerHTML = '';
        const genBtn = document.createElement('button'); genBtn.className = `pill-btn ${aktifGrafikFiltre==='Genel'?'active':''}`; genBtn.textContent = 'Genel Toplam';
        genBtn.addEventListener('click', () => { aktifGrafikFiltre = 'Genel'; gosterSekme(); });
        c.appendChild(genBtn);

        Object.keys(müfredat).forEach(d => {
            const btn = document.createElement('button'); btn.className = `pill-btn ${aktifGrafikFiltre===d?'active':''}`; btn.textContent = d;
            btn.addEventListener('click', () => { aktifGrafikFiltre = d; gosterSekme(); }); c.appendChild(btn);
        });
        cizGrafik(); 
    }
    else if(aktifSekme === "profil") {
        document.getElementById('profilPanel').style.display = "block";
    }
}

// ============================================================================
// 8. VERİ GİRİŞ (DERS) PANELİ - HATA DÜZELTİLMİŞ STEPPER (+/-) DESTEKLİ
// ============================================================================
function renderPanel() {
    const mainContent = document.getElementById('mainContent');
    let hepsiSecili = true;
    
    let html = `
        <div class="panel active">
            <div class="deneme-header">
                <h2>${aktifDers} <span class="fs-14 text-muted fw-normal">(Limit: ${SORU_LIMITLERI[aktifDers]})</span></h2>
                <div class="deneme-controls" style="flex-wrap: wrap;">
                    <div class="flex-row align-center gap-5">
                        <span class="fw-bold text-muted fs-14 mr-5">Deneme No:</span>
                        <button id="btnPrevDnm" class="btn-primary" title="Önceki Deneme"><i class="fas fa-chevron-left"></i></button>
                        <input type="number" id="denemeNoInput" value="${aktifDenemeNo}" min="1" style="width: 50px;">
                        <button id="btnNextDnm" class="btn-primary" title="Sonraki Deneme"><i class="fas fa-chevron-right"></i></button>
                    </div>
                    <button id="btnYeniDnm" class="btn-success"><i class="fas fa-plus"></i> Yeni Ekle</button>
                    <button id="btnSilDnm" class="btn-danger"><i class="fas fa-trash"></i> Sil</button>
                </div>
            </div>
            
            <div class="meta-inputs flex-wrap align-center gap-15">
                <div class="flex-row align-center gap-10">
                    <label class="fs-14 fw-bold"><i class="fas fa-calendar-alt"></i> Tarih:</label>
                    <input type="date" id="dnmTarih" value="${db.meta?.[aktifDenemeNo]?.tarih || ''}" style="width:130px;">
                    <label class="fs-14 fw-bold ml-15"><i class="fas fa-stopwatch"></i> Süre (Dk):</label>
                    <input type="number" id="dnmSure" placeholder="130" value="${db.meta?.[aktifDenemeNo]?.sure || 130}" min="0" style="width:70px;">
                </div>
                
                <div class="flex-row align-center gap-10 ml-auto flex-wrap">
                    <button id="btnBoslariKapat" class="btn-warning" title="Sadece işlem yapılmayanları (0 olanları) devre dışı bırakır."><i class="fas fa-magic"></i> İşlemsizleri Kapat</button>
                    <div style="position:relative;">
                        <input type="text" id="konuArama" placeholder="Konu Ara..." class="auth-input m-0" value="${aktifAramaTerimi}" style="width:180px; padding: 8px 10px 8px 30px;">
                        <i class="fas fa-search text-muted" style="position:absolute; left:10px; top:10px;"></i>
                    </div>
                </div>
            </div>
            
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th style="width:40px;"><input type="checkbox" id="anaCheckbox" checked></th>
                            <th>Konu Adı</th>
                            <th class="text-success text-center">Doğru</th>
                            <th class="text-danger text-center">Yanlış</th>
                            <th class="text-info text-center">Boş</th>
                            <th>Net</th>
                        </tr>
                    </thead>
                    <tbody id="dersTbody"></tbody>
                    <tfoot>
                        <tr style="background: rgba(0,0,0,0.05); font-weight:bold;">
                            <td colspan="2" style="text-align:right;">GENEL TOPLAM:</td>
                            <td id="tdTopD" class="text-success fw-bold text-center">0</td>
                            <td id="tdTopY" class="text-danger fw-bold text-center">0</td>
                            <td id="tdTopB" class="text-info fw-bold text-center">0</td>
                            <td id="tdTopNet" class="text-primary">Net: 0</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>`;
    
    mainContent.innerHTML = html;

    const tbody = document.getElementById('dersTbody');
    const anaCb = document.getElementById('anaCheckbox');
    
    // YENİ: Sistemdeki kayıtlı en büyük deneme numarasını bulan yardımcı fonksiyon
    const getMaxDenemeNo = () => {
        let dNolar = new Set();
        Object.keys(db).forEach(d => { 
            if(d !== 'meta' && d !== 'lastUpdated') {
                Object.keys(db[d]).forEach(no => dNolar.add(parseInt(no))); 
            }
        });
        return dNolar.size > 0 ? Math.max(...dNolar) : 1;
    };

    // Sol Ok: Sadece 1'den büyükse geriye gider
    document.getElementById('btnPrevDnm').addEventListener('click', () => { 
        if(aktifDenemeNo > 1) {
            aktifDenemeNo--; 
            aktifAramaTerimi = ""; 
            renderPanel(); 
        }
    });
    
    // GÜNCELLENDİ: Sağ Ok artık boş sayfa AÇMAZ. Sadece var olan son denemeye kadar gider.
    document.getElementById('btnNextDnm').addEventListener('click', () => { 
        let maxNo = getMaxDenemeNo();
        if (aktifDenemeNo < maxNo) {
            aktifDenemeNo++; 
            aktifAramaTerimi = ""; 
            renderPanel(); 
        } else {
            showToast("Son denemedesiniz. Yeni girmek için '+ Yeni Ekle' butonuna basın.", "info");
        }
    });
    
    // GÜNCELLENDİ: Elle aşırı büyük sayı girilmesini engeller
    document.getElementById('denemeNoInput').addEventListener('change', (e) => { 
        let maxNo = getMaxDenemeNo();
        let val = parseInt(e.target.value);
        if(isNaN(val) || val < 1) val = 1;
        
        // Eğer kullanıcı var olmayan büyük bir sayı girerse onu son denemeye sabitler
        if(val > maxNo) {
            val = maxNo;
            showToast(`Sadece var olan denemelere gidebilirsiniz. Yeni için '+ Yeni Ekle'yi kullanın.`, "warning");
        }
        
        aktifDenemeNo = val; 
        e.target.value = val; 
        aktifAramaTerimi = ""; 
        renderPanel(); 
    });
    
    // YENİ EKLENEN KISIM: Tek ve Gerçek Yeni Deneme Oluşturucu
    document.getElementById('btnYeniDnm').addEventListener('click', () => {
        let maxNo = getMaxDenemeNo();
        aktifDenemeNo = maxNo + 1; // En büyük numaradan bir sonrakini aç
        aktifAramaTerimi = "";
        
        // Tarih ve süreyi yeni deneme için otomatik sıfırla/hazırla
        if(!db.meta) db.meta = {};
        if(!db.meta[aktifDenemeNo]) {
            // Bugünün tarihini YYYY-MM-DD formatında alıp ekler (Saat farkı hatalarını önleyerek)
            let today = new Date();
            let dateString = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            db.meta[aktifDenemeNo] = { tarih: dateString, sure: 130 };
        }
        
        kaydet();
        renderPanel();
        showToast(`${aktifDenemeNo}. Deneme oluşturuldu! Başarılar.`, "success");
    });
    
    document.getElementById('denemeNoInput').addEventListener('change', (e) => { 
        let val = parseInt(e.target.value);
        if(isNaN(val) || val < 1) val = 1;
        aktifDenemeNo = val; e.target.value = val; aktifAramaTerimi = ""; renderPanel(); 
    });
    
    document.getElementById('btnSilDnm').addEventListener('click', () => { document.getElementById('silModal').style.display = 'flex'; });
    
    document.getElementById('dnmTarih').addEventListener('change', (e) => {
        if(!db.meta) db.meta = {}; if(!db.meta[aktifDenemeNo]) db.meta[aktifDenemeNo] = {};
        db.meta[aktifDenemeNo].tarih = e.target.value; kaydet();
    });
    
    document.getElementById('dnmSure').addEventListener('change', (e) => {
        if(!db.meta) db.meta = {}; if(!db.meta[aktifDenemeNo]) db.meta[aktifDenemeNo] = {};
        let girilenSure = parseInt(e.target.value);
        if (isNaN(girilenSure) || girilenSure <= 0) { girilenSure = 130; e.target.value = 130; }
        db.meta[aktifDenemeNo].sure = girilenSure; kaydet();
    });

    const aramaInput = document.getElementById('konuArama');
    aramaInput.addEventListener('input', (e) => { aktifAramaTerimi = e.target.value.toLocaleLowerCase('tr-TR'); uygulaAramaFiltresi(); });

    document.getElementById('btnBoslariKapat').addEventListener('click', () => {
        let islemYapildi = false;
        müfredat[aktifDers].forEach(kAd => {
            let data = db[aktifDers]?.[aktifDenemeNo]?.[kAd] || {};
            let d = parseInt(data.d) || 0; let y = parseInt(data.y) || 0; let b = parseInt(data.b) || 0;
            let s = data.s === undefined ? true : data.s;
            if (d === 0 && y === 0 && b === 0 && s === true) {
                veriNesnesiOlustur(kAd); db[aktifDers][aktifDenemeNo][kAd].s = false; islemYapildi = true;
            }
        });
        if (islemYapildi) { kaydet(); renderPanel(); showToast("İşlemsiz konular kapatıldı.", "success"); } 
        else { showToast("Kapatılacak boş konu bulunamadı.", "info"); }
    });

    // HATASI DÜZELTİLMİŞ STEPPER OLUŞTURUCU
    const createStepper = (val, disabled, colorClass, tur, kAd, s, tdNet, cb, inpGroupRef) => {
        const div = document.createElement('div'); div.className = 'stepper-group';
        const btnMinus = document.createElement('button'); btnMinus.className = 'stepper-btn'; btnMinus.innerHTML = '−';
        const btnPlus = document.createElement('button'); btnPlus.className = `stepper-btn ${colorClass}`; btnPlus.innerHTML = '+';
        
        const inp = document.createElement('input');
        inp.type = 'number'; inp.min = 0; inp.value = val; inp.disabled = disabled;
        inp.className = `${colorClass} fw-bold stepper-input`;
        
        // ÖNEMLİ DÜZELTME: inpGroupRef.inp yerine doğru anahtarı (d, y, b) kullanıyoruz
        inpGroupRef[tur] = inp;

        div.append(btnMinus, inp, btnPlus);

        btnMinus.onclick = () => {
            if(!inp.disabled && parseInt(inp.value) > 0) {
                inp.value = parseInt(inp.value) - 1; 
                inp.dispatchEvent(new Event('input'));
            }
        };

        btnPlus.onclick = () => {
            if(!inp.disabled) {
                inp.value = parseInt(inp.value || 0) + 1; 
                inp.dispatchEvent(new Event('input'));
            }
        };

        return div;
    };

    müfredat[aktifDers].forEach((kAd) => {
        let data = db[aktifDers]?.[aktifDenemeNo]?.[kAd] || {d:0, y:0, b:0, s:true}; 
        let s = data.s === undefined ? true : data.s; 
        if(!s) hepsiSecili = false;
        
        let net = (data.d || 0) - ((data.y || 0) / 4); 
        
        const tr = document.createElement('tr');
        if(!s) tr.className = 'pasif-satir';

        const tdCb = document.createElement('td');
        const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = s;
        tdCb.appendChild(cb);

        const tdName = document.createElement('td'); tdName.textContent = kAd;

        const tdNet = document.createElement('td'); tdNet.className = 'fw-600';
        tdNet.textContent = s ? net.toFixed(2) : '-';
        if(s && net < 0) tdNet.style.color = 'var(--alert-color)';

        let refs = { d: null, y: null, b: null };

        const tdD = document.createElement('td'); 
        tdD.appendChild(createStepper(data.d || 0, !s, 'text-success', 'd', kAd, s, tdNet, cb, refs));
        
        const tdY = document.createElement('td'); 
        tdY.appendChild(createStepper(data.y || 0, !s, 'text-danger', 'y', kAd, s, tdNet, cb, refs));
        
        const tdB = document.createElement('td'); 
        tdB.appendChild(createStepper(data.b || 0, !s, 'text-info', 'b', kAd, s, tdNet, cb, refs));

        tr.append(tdCb, tdName, tdD, tdY, tdB, tdNet);
        tbody.appendChild(tr);

        // Satır Aç/Kapa
        cb.addEventListener('change', (e) => {
            let isChecked = e.target.checked;
            veriNesnesiOlustur(kAd); db[aktifDers][aktifDenemeNo][kAd].s = isChecked; kaydet();
            tr.className = isChecked ? '' : 'pasif-satir';
            refs.d.disabled = refs.y.disabled = refs.b.disabled = !isChecked;
            guncelleSatirArayuz(kAd, refs.d.value, refs.y.value, isChecked, tdNet);
            hesaplaAltToplam();
        });

        // Limit Koruyucu ve Hesaplayıcı Dinleyici
        const handleInput = (tur, val, inpRef) => {
            let deger = Math.max(0, parseInt(val) || 0);
            let maxIzinVerilen = getMaksimumGirebilir(kAd, tur);
            
            if(deger > maxIzinVerilen) {
                deger = maxIzinVerilen;
                showToast(`Limit aşılamaz! Otomatik ${deger} yapıldı.`, "warning");
                inpRef.value = deger; // UI'ı hemen düzelt
            }
            
            veriNesnesiOlustur(kAd);
            db[aktifDers][aktifDenemeNo][kAd][tur] = deger;
            kaydet();
            guncelleSatirArayuz(kAd, refs.d.value, refs.y.value, cb.checked, tdNet);
            hesaplaAltToplam();
        };

        // Event Dinleyicilerini Ekliyoruz
        refs.d.addEventListener('input', (e) => handleInput('d', e.target.value, refs.d));
        refs.y.addEventListener('input', (e) => handleInput('y', e.target.value, refs.y));
        refs.b.addEventListener('input', (e) => handleInput('b', e.target.value, refs.b));
    });

    anaCb.checked = hepsiSecili;
    anaCb.addEventListener('change', (e) => {
        let isChecked = e.target.checked;
        müfredat[aktifDers].forEach(kAd => { veriNesnesiOlustur(kAd); db[aktifDers][aktifDenemeNo][kAd].s = isChecked; });
        kaydet(); renderPanel(); 
    });

    hesaplaAltToplam(); 
    if(aktifAramaTerimi !== "") { uygulaAramaFiltresi(); aramaInput.focus(); aramaInput.setSelectionRange(aktifAramaTerimi.length, aktifAramaTerimi.length); }
}

function getMaksimumGirebilir(aktifKonu, tur) {
    let digerTop = 0; 
    müfredat[aktifDers].forEach(k => { 
        let s = db[aktifDers]?.[aktifDenemeNo]?.[k]?.s; 
        if (s !== false) { 
            let kData = db[aktifDers]?.[aktifDenemeNo]?.[k] || {};
            if(k !== aktifKonu) { digerTop += (Number(kData.d || 0) + Number(kData.y || 0) + Number(kData.b || 0)); } 
            else {
                let dVal = tur === 'd' ? 0 : Number(kData.d || 0);
                let yVal = tur === 'y' ? 0 : Number(kData.y || 0);
                let bVal = tur === 'b' ? 0 : Number(kData.b || 0);
                digerTop += (dVal + yVal + bVal);
            }
        } 
    });
    return Math.max(0, SORU_LIMITLERI[aktifDers] - digerTop);
}

function uygulaAramaFiltresi() {
    const rows = document.querySelectorAll('#dersTbody tr');
    rows.forEach(row => {
        const konuAdi = row.querySelector('td:nth-child(2)').textContent.toLocaleLowerCase('tr-TR');
        row.style.display = konuAdi.includes(aktifAramaTerimi) ? '' : 'none';
    });
}

function veriNesnesiOlustur(kAd) {
    if(!db[aktifDers]) db[aktifDers] = {}; 
    if(!db[aktifDers][aktifDenemeNo]) db[aktifDers][aktifDenemeNo] = {}; 
    if(!db[aktifDers][aktifDenemeNo][kAd]) db[aktifDers][aktifDenemeNo][kAd] = {d:0, y:0, b:0, s:true};
}

function guncelleSatirArayuz(kAd, d, y, s, tdNet) {
    let dVal = parseInt(d)||0, yVal = parseInt(y)||0;
    let net = dVal - (yVal/4);
    tdNet.textContent = s ? net.toFixed(2) : '-';
    tdNet.style.color = (s && net < 0) ? 'var(--alert-color)' : '';
}

function hesaplaAltToplam() {
    let topD = 0, topY = 0, topB = 0;
    müfredat[aktifDers].forEach((kAd) => {
        let data = db[aktifDers]?.[aktifDenemeNo]?.[kAd];
        if(data && data.s !== false) { topD += parseInt(data.d)||0; topY += parseInt(data.y)||0; topB += parseInt(data.b)||0; }
    });
    let topNet = topD - (topY/4);
    document.getElementById('tdTopD').textContent = topD;
    document.getElementById('tdTopY').textContent = topY;
    document.getElementById('tdTopB').textContent = topB;
    
    let kalan = SORU_LIMITLERI[aktifDers] - (topD + topY + topB);
    document.getElementById('tdTopNet').textContent = `Net: ${topNet.toFixed(2)} | İşaretlenmeyen: ${kalan}`;
}

// ============================================================================
// 9. AKILLI ANALİZ MOTORU & TRAFİK LAMBASI
// ============================================================================
function analizEt() {
    const dZayif = document.getElementById('analizZayif'); const dGelistir = document.getElementById('analizGelistir');
    const dBasarili = document.getElementById('analizBasarili'); const dRadar = document.getElementById('analizPaslananIcerik');

    if(!dZayif || !dGelistir || !dBasarili || !dRadar) return;
    dZayif.innerHTML = ''; dGelistir.innerHTML = ''; dBasarili.innerHTML = ''; dRadar.innerHTML = '';
    
    let denemeNolar = new Set(); 
    Object.keys(db).forEach(d => { if(d !== 'meta' && d !== 'lastUpdated') Object.keys(db[d]).forEach(no => denemeNolar.add(parseInt(no))); });
    
    let sirali = Array.from(denemeNolar).sort((a,b) => a-b); 
    
    if(sirali.length === 0) {
        document.querySelector('.analiz-grid-3').innerHTML = `<div class="empty-state"><i class="fas fa-folder-open"></i><p>Hadi ilk denemeni ekleyerek analizlere başlayalım!</p></div>`;
        dRadar.innerHTML = '<p class="text-muted">Veri bulunamadı.</p>'; return;
    }

    if(document.querySelector('.analiz-grid-3 .empty-state')) { gosterSekme(); return; }

    let analizEdilecekler = aktifAnalizFiltresi === 0 ? sirali : sirali.slice(-aktifAnalizFiltresi); 
    let son3 = sirali.slice(-3); let ders = aktifAnalizDersi; let dC = false; 
    
    müfredat[ders].forEach(k => {
        let yS = 0, dS = 0, bS = 0, sS = 0; let dIlk = 0, yIlk = 0, bIlk = 0; let dSon = 0, ySon = 0, bSon = 0;
        let mid = Math.floor(analizEdilecekler.length / 2);
        
        analizEdilecekler.forEach((dNo, i) => {
            if (!db[ders] || !db[ders][dNo]) return; 
            dC = true; 
            let data = db[ders][dNo][k]; let s = data === undefined ? true : data.s;
            if(s) { 
                sS++; let d = Number(data?.d || 0); let y = Number(data?.y || 0); let b = Number(data?.b || 0); 
                bS += b; yS += y; dS += d; 
                if(i < mid) { dIlk += d; yIlk += y; bIlk += b; } else { dSon += d; ySon += y; bSon += b; } 
            }
        });
        
        let tI = ""; let toplamIlk = dIlk + yIlk + bIlk; let toplamSon = dSon + ySon + bSon;
        if(analizEdilecekler.length >= 2 && toplamIlk > 0 && toplamSon > 0) { 
            let ortIlk = (dIlk / toplamIlk) * 100; let ortSon = (dSon / toplamSon) * 100;
            if(ortSon > ortIlk) tI = " <span class='text-success fw-bold fs-13' title='Yükselişte'><i class='fas fa-arrow-trend-up'></i></span>"; 
            else if(ortSon < ortIlk) tI = " <span class='text-danger fw-bold fs-13' title='Düşüşte'><i class='fas fa-arrow-trend-down'></i></span>"; 
        }
        
        let toplamSorulan = dS + yS + bS;
        if(sS > 0 && toplamSorulan > 0) {
            let isabet = (dS / toplamSorulan) * 100;
            const itemDiv = document.createElement('div'); itemDiv.className = 'analiz-item';
            const textDiv = document.createElement('div'); textDiv.innerHTML = `<strong>${k}</strong>${tI} <div class="fs-13 mt-5"><span class="text-muted">${sS} Sınav:</span> <span class="text-success fw-bold">${dS}D</span>, <span class="text-danger fw-bold">${yS}Y</span>, <span class="text-info fw-bold">${bS}B</span></div>`;
            const percDiv = document.createElement('div'); percDiv.className = 'fw-bold fs-18'; percDiv.textContent = `%${isabet.toFixed(0)}`;
            itemDiv.append(textDiv, percDiv);
            
            if(isabet < 50) dZayif.appendChild(itemDiv); else if(isabet < 85) dGelistir.appendChild(itemDiv); else dBasarili.appendChild(itemDiv);
        }

        if(son3.length >= 3) {
            let hc = true; 
            son3.forEach(dNo => { 
                if (!db[ders] || !db[ders][dNo]) return; 
                let data = db[ders][dNo][k]; let s = data === undefined ? true : data.s; if(s) hc = false; 
            });
            if(hc && dC) { 
                const rItem = document.createElement('div'); rItem.className = 'radar-item';
                rItem.innerHTML = `<strong>${k}</strong> <span class="fs-13 text-muted block mt-5"><i class="fas fa-exclamation-triangle"></i> Son 3 denemedir atlanıyor. Mutlaka tekrar yap!</span>`;
                dRadar.appendChild(rItem);
            }
        }
    });
    
    if(!dC) { dZayif.innerHTML = dGelistir.innerHTML = dBasarili.innerHTML = `<div class="p-15 text-muted">Bu ders için veri yok.</div>`; } 
    else {
        if(dZayif.childElementCount === 0) dZayif.innerHTML = `<div class="p-15 text-success fw-600"><i class="fas fa-check-circle"></i> Zayıf konu yok!</div>`;
        if(dGelistir.childElementCount === 0) dGelistir.innerHTML = `<div class="p-15 text-success fw-600"><i class="fas fa-check-circle"></i> Geliştirilecek konu kalmadı!</div>`;
        if(dBasarili.childElementCount === 0) dBasarili.innerHTML = `<div class="p-15 text-muted"><i class="fas fa-hourglass-half"></i> Henüz %85 başarı yok.</div>`;
    }

    if(dRadar.childElementCount === 0) dRadar.innerHTML = `<p class="text-success fw-bold p-10 m-0"><i class="fas fa-shield-alt"></i> Harika! Bu derste paslanmış bir konu bulunmuyor.</p>`;
}

// ============================================================================
// 10. YAPAY ZEKA TAHMİNE DAYALI ANALİZ
// ============================================================================
function runAIPrediction() {
    const aiText = document.getElementById('aiPredictionText'); if(!aiText) return;

    let denemeler = Object.keys(db).filter(k => k !== 'meta' && k !== 'lastUpdated').flatMap(d => Object.keys(db[d]||{})).map(Number);
    let uniqueDenemeler = [...new Set(denemeler)].sort((a,b) => a-b);
    
    if(uniqueDenemeler.length < 5) { aiText.textContent = "Yapay zekanın sağlıklı bir tahmin yapabilmesi için en az 5 deneme verisine ihtiyacı var."; return; }

    let son5 = uniqueDenemeler.slice(-5); let xData = [], yDataGY = [], yDataGK = [];

    son5.forEach((dNo, index) => {
        xData.push(index + 1); let gyNet = 0, gkNet = 0;
        Object.keys(müfredat).forEach(ders => {
            let dersNet = 0;
            müfredat[ders].forEach(k => {
                let data = db[ders]?.[dNo]?.[k];
                if(!data || data.s !== false) { let d = data?.d || 0; let y = data?.y || 0; dersNet += (d - (y / 4)); }
            });
            if(ders === "Türkçe" || ders === "Matematik") gyNet += dersNet; else gkNet += dersNet;
        });
        yDataGY.push(gyNet); yDataGK.push(gkNet);
    });

    const calcLR = (x, y) => {
        let n = x.length; let sumX = x.reduce((a,b)=>a+b, 0); let sumY = y.reduce((a,b)=>a+b, 0);
        let sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0); let sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
        let slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX); let intercept = (sumY - slope * sumX) / n;
        return { slope, intercept };
    };

    let lrGY = calcLR(xData, yDataGY); let lrGK = calcLR(xData, yDataGK);
    let nextX = xData.length + 2; 
    let predGY = Math.min(60, Math.max(0, (lrGY.slope * nextX + lrGY.intercept).toFixed(2)));
    let predGK = Math.min(60, Math.max(0, (lrGK.slope * nextX + lrGK.intercept).toFixed(2)));
    let tavsiye = lrGY.slope <= 0.1 ? "Genel Yetenek ivmen düşük veya durağan, pratikleri artırmalısın." : "Genel Yetenek yükselişin harika, böyle devam et.";
    aiText.innerHTML = `Son 5 denemedeki ivmene göre, KPSS sınavına doğru <strong>Genel Yetenek netin ortalama ${predGY}'e</strong>, <strong>Genel Kültür netin ${predGK}'ye</strong> ulaşacak. ${tavsiye}`;
}

// ============================================================================
// 11. GEÇMİŞ DENEMELER VE EXPORT
// ============================================================================
function listeleGecmis() {
    const div = document.getElementById('gecmisIcerik'); let dNolar = new Set(); 
    Object.keys(db).forEach(d => { if(d !== 'meta' && d !== 'lastUpdated') Object.keys(db[d]).forEach(no => dNolar.add(parseInt(no))); });
    
    let sirali = Array.from(dNolar).sort((a,b) => a-b); 
    if(sirali.length === 0) { div.innerHTML = `<div class="empty-state"><i class="fas fa-file-excel"></i><p>Geçmiş deneme kaydı bulunamadı.</p></div>`; return; }

    let tS = 0, sSayisi = 0;
    let html = `<table><thead><tr><th>No</th><th>Tarih</th><th>Süre</th><th>Türkçe</th><th>Matematik</th><th>Tarih</th><th>Coğrafya</th><th>Vatandaşlık</th><th>GY Net</th><th>GK Net</th><th>Toplam</th></tr></thead><tbody>`;
        
    sirali.forEach(dNo => {
        let net = {}; 
        Object.keys(müfredat).forEach(ders => { 
            let dN = 0; 
            müfredat[ders].forEach(k => { let data = db[ders]?.[dNo]?.[k]; if(!data || data.s !== false) { dN += ((data?.d || 0) - ((data?.y || 0) / 4)); } }); 
            net[ders] = dN; 
        });
        
        let gy = net["Türkçe"] + net["Matematik"]; let gk = net["Tarih"] + net["Coğrafya"] + net["Vatandaşlık"]; let tNet = gy + gk;
        let tarih = db.meta?.[dNo]?.tarih ? new Date(db.meta[dNo].tarih).toLocaleDateString('tr-TR') : '-';
        let sure = db.meta?.[dNo]?.sure || 130; 
        if(sure !== '-') { tS += parseInt(sure); sSayisi++; }
        
        html += `<tr><td data-label="No"><strong>${dNo}</strong></td><td data-label="Tarih">${tarih}</td><td data-label="Süre">${sure} dk</td><td data-label="Türkçe">${net["Türkçe"].toFixed(2)}</td><td data-label="Matematik">${net["Matematik"].toFixed(2)}</td><td data-label="Tarih">${net["Tarih"].toFixed(2)}</td><td data-label="Coğrafya">${net["Coğrafya"].toFixed(2)}</td><td data-label="Vatandaşlık">${net["Vatandaşlık"].toFixed(2)}</td><td data-label="GY Net" class="text-primary fw-bold">${gy.toFixed(2)}</td><td data-label="GK Net" class="text-primary fw-bold">${gk.toFixed(2)}</td><td data-label="Toplam" class="fw-bold" style="color:var(--success-color);">${tNet.toFixed(2)}</td></tr>`;
    });
    
    div.innerHTML = html + `</tbody></table>`;
    
    let sureYorum = ""; const zamanAlani = document.getElementById('zamanAnaliziAlani');
    if(sSayisi > 0) {
        let ort = Math.round(tS / sSayisi);
        if(ort <= 130) sureYorum = `<span class="text-success"><i class="fas fa-check-circle"></i> Sınav süresine (130dk) göre harika ilerliyorsun!</span>`; 
        else sureYorum = `<span class="text-danger"><i class="fas fa-exclamation-triangle"></i> Sınav süresini aşıyorsun, hızlanmalısın.</span>`; 
        zamanAlani.innerHTML = `⏱️ Ortalama Süren: <strong>${ort} Dakika</strong> | ${sureYorum}`; zamanAlani.classList.remove('d-none');
    } else zamanAlani.classList.add('d-none');
}

function raporIndirCSV() {
    let csv = "data:text/csv;charset=utf-8,\uFEFFDeneme No,Tarih,Sure (Dk),Turkce,Matematik,Tarih,Cografya,Vatandaslik,GY Net,GK Net,Toplam Net\n";
    let dNolar = new Set(); 
    Object.keys(db).forEach(d => { if(d !== 'meta' && d !== 'lastUpdated') { Object.keys(db[d]).forEach(no => dNolar.add(parseInt(no))); } });
    
    Array.from(dNolar).sort((a,b) => a-b).forEach(dNo => {
        let tarih = db.meta?.[dNo]?.tarih || "-"; let sure = db.meta?.[dNo]?.sure || "-"; let net = {};
        Object.keys(müfredat).forEach(ders => { 
            let dN = 0; müfredat[ders].forEach(k => { let data = db[ders]?.[dNo]?.[k]; if(!data || data.s !== false) dN += ((data?.d || 0) - ((data?.y || 0) / 4)); }); 
            net[ders] = dN; 
        });
        let gy = net["Türkçe"] + net["Matematik"], gk = net["Tarih"] + net["Coğrafya"] + net["Vatandaşlık"];
        csv += `${dNo},${tarih},${sure},${net["Türkçe"].toFixed(2)},${net["Matematik"].toFixed(2)},${net["Tarih"].toFixed(2)},${net["Coğrafya"].toFixed(2)},${net["Vatandaşlık"].toFixed(2)},${gy.toFixed(2)},${gk.toFixed(2)},${(gy+gk).toFixed(2)}\n`;
    });
    
    let link = document.createElement("a"); link.setAttribute("href", encodeURI(csv)); 
    link.setAttribute("download", "KPSS_Deneme_Raporu.csv"); document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

// ============================================================================
// 12. SVG GRAFİK ÇİZİMİ
// ============================================================================
function cizGrafik() {
    const wrap = document.getElementById('svgChartWrapper'); let dNolar = new Set(); 
    Object.keys(db).forEach(d => { if(d !== 'meta' && d !== 'lastUpdated') { Object.keys(db[d]).forEach(no => dNolar.add(parseInt(no))); } });
    
    let sirali = Array.from(dNolar).sort((a,b) => a-b); 
    if(sirali.length === 0) { wrap.innerHTML = `<div class="empty-state"><i class="fas fa-chart-line"></i><p>Grafik çizmek için veri bekleniyor.</p></div>`; return; }
    
    let data = sirali.map(dNo => {
        let topN = 0, varMi = false;
        Object.keys(db).forEach(ders => { 
            if(ders !== 'meta' && ders !== 'lastUpdated' && (aktifGrafikFiltre === "Genel" || ders === aktifGrafikFiltre)) { 
                müfredat[ders].forEach(k => { 
                    let data = db[ders]?.[dNo]?.[k]; 
                    if (!data || data.s !== false) { if((data?.d || 0) > 0 || (data?.y || 0) > 0) varMi = true; topN += ((data?.d || 0) - ((data?.y || 0) / 4)); } 
                }); 
            } 
        });
        return { x: dNo, y: varMi ? topN : null };
    }).filter(pt => pt.y !== null);
    
    if(data.length === 0) return wrap.innerHTML = '<p class="text-center text-muted">Filtreye uygun veri yok.</p>';
    
    const w = wrap.clientWidth || 800, h = 300, pad = 50; 
    let toplamNet = data.reduce((sum, pt) => sum + pt.y, 0); let ortalamaNet = data.length > 0 ? (toplamNet / data.length) : 0;
    let maxN = Math.max(...data.map(d => d.y), 10, ortalamaNet), minN = Math.min(...data.map(d => d.y), 0);
    
    let targetTotal = 0; 
    if(aktifGrafikFiltre === "Genel" && currentUid) { targetTotal = (parseFloat(localStorage.getItem(`gy_target_${currentUid}`)) || 0) + (parseFloat(localStorage.getItem(`gk_target_${currentUid}`)) || 0); }
    if(targetTotal > maxN) maxN = targetTotal; 
    
    let xB = (w - 2 * pad) / Math.max(1, data.length - 1), yB = (h - 2 * pad) / (maxN - minN || 1);
    let cRengi = mevcutTema === 'dark' ? "#334155" : "#e2e8f0", mRengi = mevcutTema === 'dark' ? "#94a3b8" : "#64748b";
    
    let svg = `<svg viewBox="0 0 ${w} ${h}">`; let step = Math.ceil((maxN - minN) / 5) || 1;
    
    for(let i = minN; i <= maxN; i += step) { 
        let yP = h - pad - ((i - minN) * yB); 
        svg += `<line x1="${pad}" y1="${yP}" x2="${w-pad}" y2="${yP}" stroke="${cRengi}"></line>`;
        svg += `<text x="${pad-10}" y="${yP+4}" fill="${mRengi}" font-size="12" text-anchor="end">${i.toFixed(0)}</text>`; 
    }
    
    if(targetTotal > 0 && aktifGrafikFiltre === "Genel") { 
        let tY = h - pad - ((targetTotal - minN) * yB); 
        svg += `<line x1="${pad}" y1="${tY}" x2="${w-pad}" y2="${tY}" stroke="var(--success-color)" stroke-width="2" stroke-dasharray="5,5"></line>`;
        svg += `<text x="${w-pad+5}" y="${tY+4}" fill="var(--success-color)" font-size="12" font-weight="bold">Hedef: ${parseFloat(targetTotal.toFixed(2))}</text>`; 
    }

    if (data.length > 0) {
        let ortY = h - pad - ((ortalamaNet - minN) * yB);
        svg += `<line x1="${pad}" y1="${ortY}" x2="${w-pad}" y2="${ortY}" stroke="var(--warning-color)" stroke-width="2" stroke-dasharray="8,6" opacity="0.8"></line>`;
        svg += `<text x="${w-pad+5}" y="${ortY+4}" fill="var(--warning-color)" font-size="12" font-weight="bold" opacity="0.9">Ort: ${parseFloat(ortalamaNet.toFixed(3))}</text>`;
    }
    
    let pD = "", circs = ""; 
    data.forEach((pt, i) => {
        let cx = pad + (i * xB), cy = h - pad - ((pt.y - minN) * yB); 
        pD += (i === 0) ? `M ${cx} ${cy} ` : `L ${cx} ${cy} `;
        svg += `<text x="${cx}" y="${h-pad+20}" fill="${mRengi}" font-size="12" text-anchor="middle">${pt.x}.Dnm</text>`;
        circs += `<circle cx="${cx}" cy="${cy}" r="5" fill="var(--card-bg)" stroke="var(--primary-color)" stroke-width="2"></circle>`;
        circs += `<text x="${cx}" y="${cy-12}" fill="var(--primary-color)" font-size="12" font-weight="bold" text-anchor="middle">${pt.y.toFixed(2)}</text>`;
    }); 
    
    wrap.innerHTML = svg + `<path d="${pD}" fill="none" stroke="var(--primary-color)" stroke-width="3" stroke-linecap="round"></path>${circs}</svg>`;
}
