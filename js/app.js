import { saveUserDataToDB, loadUserDataFromDB } from './db.js';

// ============================================================================
// 1. MÜFREDAT VE SABİTLER
// ============================================================================
const SORU_LIMITLERI = { "Türkçe": 30, "Matematik": 30, "Tarih": 27, "Coğrafya": 18, "Vatandaşlık": 15 };

const müfredat = {
    "Türkçe": ["Sözcükte Anlam", "Cümlede Anlam", "Paragraf", "Ses Bilgisi", "Sözcükte Yapı", "Sözcük Türleri", "Cümlenin Türleri", "Yazım Kuralları", "Noktalama İşaretleri", "Anlatım Bozuklukları", "Sözel Mantık"],
    "Matematik": ["Temel Kavramlar", "Sayılar", "Sayı Kümeleri", "Bölme ve Bölünebilme Kuralları", "Asal Çarpanlara Ayırma", "EBOB-EKOK", "Birinci Dereceden Denklemler", "Rasyonel Sayılar", "Eşitsizlik", "Mutlak Değer", "Üslü Sayılar", "Köklü Sayılar", "Çarpanlara Ayırma", "Oran-Orantı", "Denklem Kurma Problemleri", "Yaş Problemleri", "Yüzde Problemleri", "Kâr-Zarar Problemleri", "Karışım Problemleri", "Hareket Problemleri", "Kümeler", "İşlem ve Modüler Aritmetik", "Permütasyon, Kombinasyon ve Olasılık", "Sayısal Mantık"],
    "Tarih": ["İslamiyet Öncesi Türk Tarihi", "Türk-İslam Tarihi", "İlk Müslüman Türk Devletleri", "Anadolu Selçuklu Devleti Siyasi Tarihi", "Osmanlı Devleti Kültür ve Medeniyeti", "Osmanlı Kuruluş, Yükselme, Duraklama", "Osmanlı Gerileme ve Dağılma", "Trablusgarp Savaşı (1911-1912)", "1. Dünya Savaşı", "Kurtuluş Savaşına Hazırlık Dönemi", "Kurtuluş Savaşı Muharebeler ve Antlaşmalar", "Atatürk İlke ve İnkılapları", "Atatürk Dönemi Türk Dış Politikası", "Çağdaş Türk ve Dünya Tarihi"],
    "Coğrafya": ["Türkiye'nin Coğrafi Konumu", "Matematik (Mutlak) Konum", "Özel (Göreceli) Konum", "Türkiye'nin Yerşekilleri", "Türkiye'nin Platoları ve Ovaları", "Dış Güçlerin Oluşturduğu Yerşekilleri", "Türkiye'de Toprak Oluşumu ve Tipleri", "Türkiye'nin Su Varlığı", "Doğal Afetler", "Türkiye'nin İklimi ve Bitki Örtüsü", "Türkiye'de Nüfus, Yerleşme ve Göç", "Türkiye'de Tarım, Hayvancılık ve Orman", "Madenler ve Enerji Kaynakları", "Ulaşım, Ticaret ve Turizm", "Türkiye'nin Coğrafi Bölgeleri"],
    "Vatandaşlık": ["Hukukun Temel Kavramları", "Devlet Biçimleri Demokrasi", "Anayasa Hukukuna Giriş", "1982 Anayasasının Temel İlkeleri", "Yasama", "Yürütme", "Yargı", "Temel Hak Ve Hürriyetler", "İdare Hukuku", "Uluslararası Kuruluşlar", "Güncel Bilgiler"]
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
let mevcutTema = localStorage.getItem('kpss_tema') || 'dark';

// Başlangıç Tema Ayarı
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
               type === "success" ? '<i class="fas fa-check-circle"></i>' : 
               '<i class="fas fa-info-circle"></i>';
               
    // XSS Koruması için innerHTML sadece ikon için, metin için textContent
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
        db.lastUpdated = Date.now(); // Veri Kaybı (Conflict) kontrolü için timestamp
        saveUserDataToDB(currentUid, db); 
    }
}

// ============================================================================
// 4. ÇEVRİMDIŞI / ÇEVRİMİÇİ AĞ YÖNETİMİ
// ============================================================================
window.addEventListener('online', () => {
    showToast("İnternet bağlantısı sağlandı. Veriler buluta eşitleniyor...", "info");
    kaydet();
});

window.addEventListener('offline', () => { 
    showToast("İnternet koptu. Veriler cihazınıza (çevrimdışı) kaydediliyor.", "warning"); 
});

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
        
        const savedGy = localStorage.getItem(`gy_target_${uid}`); 
        const savedGk = localStorage.getItem(`gk_target_${uid}`);
        
        if(savedGy) document.getElementById("gy-target").value = savedGy; 
        if(savedGk) document.getElementById("gk-target").value = savedGk;
        
        renderNav(); 
        gosterSekme(); 
        showToast("Veriler başarıyla yüklendi!", "success");
    } catch (error) { 
        showToast("Veri çekme hatası.", "error"); 
    }
}

export function clearUserApp() { 
    currentUid = null; 
    db = {}; 
    document.getElementById('mainContent').innerHTML = ''; 
}

// ============================================================================
// 6. EVENT LISTENER'LAR (MODÜLER - GLOBAL SCOPE KİRLİLİĞİ YOK)
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    
    document.getElementById('themeBtn')?.addEventListener('click', () => {
        mevcutTema = mevcutTema === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', mevcutTema);
        localStorage.setItem('kpss_tema', mevcutTema);
        document.getElementById('themeBtn').innerHTML = mevcutTema === 'dark' ? '<i class="fas fa-sun"></i> Gündüz Modu' : '<i class="fas fa-moon"></i> Gece Modu';
        if(aktifSekme === "grafik") cizGrafik();
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
                    let d = data?.d || 0; 
                    let y = data?.y || 0; 
                    n += (d - (y / 4)); 
                }
            });
            if(ders === "Türkçe" || ders === "Matematik") gyCurrent += n; 
            else gkCurrent += n;
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
        
        // XSS Önlemi: Değerlendirme metnini güvenli basma
        resArea.querySelector('.evaluation-text').textContent = evalText;
        resArea.classList.remove('d-none');
    });

    document.getElementById('cancelDeleteBtn')?.addEventListener('click', () => {
        document.getElementById('silModal').style.display = 'none';
    });

    document.getElementById('confirmDeleteBtn')?.addEventListener('click', () => {
        Object.keys(db).forEach(d => { 
            if(db[d]?.[aktifDenemeNo]) delete db[d][aktifDenemeNo]; 
        });
        if(db.meta?.[aktifDenemeNo]) delete db.meta[aktifDenemeNo]; 
        
        kaydet(); 
        renderPanel(); 
        document.getElementById('silModal').style.display = 'none'; 
        showToast(`${aktifDenemeNo}. Deneme silindi.`, "success");
    });

    document.getElementById('exportCsvBtn')?.addEventListener('click', raporIndirCSV);
    document.getElementById('printPdfBtn')?.addEventListener('click', () => window.print());

    window.addEventListener('resize', () => { 
        if(aktifSekme === "grafik") cizGrafik(); 
    });
});

// ============================================================================
// 7. NAVİGASYON (SEKMELER) YÖNETİMİ
// ============================================================================
function renderNav() {
    const nav = document.getElementById('dersNav'); 
    nav.innerHTML = '';
    
    Object.keys(müfredat).forEach(ders => {
        const btn = document.createElement('button'); 
        btn.textContent = ders;
        if(ders === aktifDers && aktifSekme === "ders") btn.className = 'active';
        btn.addEventListener('click', () => { 
            aktifDers = ders; 
            aktifSekme = "ders"; 
            renderNav(); 
            gosterSekme(); 
        });
        nav.appendChild(btn);
    });
    
    const paneller = [ 
        { id: 'analiz', text: 'Analiz & Trend', cls: 'btn-analiz', icon: 'fa-chart-pie' }, 
        { id: 'hedef', text: 'Hedef & Geçmiş', cls: 'btn-hedef', icon: 'fa-bullseye' }, 
        { id: 'grafik', text: 'Grafik', cls: 'btn-grafik', icon: 'fa-chart-area' } 
    ];
    
    paneller.forEach(p => {
        const btn = document.createElement('button'); 
        btn.innerHTML = `<i class="fas ${p.icon}"></i> ${p.text}`; 
        btn.className = `${p.cls} ${aktifSekme === p.id ? "active" : ""}`;
        btn.addEventListener('click', () => { 
            aktifSekme = p.id; 
            renderNav(); 
            gosterSekme(); 
        });
        nav.appendChild(btn);
    });
}

function gosterSekme() {
    ['mainContent', 'eksikPanel', 'hedefPanel', 'grafikPanel'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.display = "none";
    });
    
    if(aktifSekme === "ders") { 
        document.getElementById('mainContent').style.display = "block"; 
        renderPanel(); 
    }
    else if(aktifSekme === "analiz") { 
        document.getElementById('eksikPanel').style.display = "block"; 
        
        const dersFiltreKutusu = document.getElementById('analizDersFiltreler');
        dersFiltreKutusu.innerHTML = '';
        Object.keys(müfredat).forEach(d => {
            const btn = document.createElement('button');
            btn.className = `pill-btn ${aktifAnalizDersi === d ? 'active' : ''}`;
            btn.textContent = d;
            btn.addEventListener('click', () => {
                aktifAnalizDersi = d;
                dersFiltreKutusu.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                analizEt();
            });
            dersFiltreKutusu.appendChild(btn);
        });

        // Zaman filtre eventlerini bağla
        document.querySelectorAll('#analizFiltreler .pill-btn').forEach(btn => {
            btn.replaceWith(btn.cloneNode(true)); // Event duplication önleme
        });
        document.querySelectorAll('#analizFiltreler .pill-btn').forEach(btn => {
            btn.addEventListener('click', (e) => { 
                aktifAnalizFiltresi = parseInt(e.target.getAttribute('data-filter')); 
                document.querySelectorAll('#analizFiltreler .pill-btn').forEach(b => b.classList.remove('active')); 
                e.target.classList.add('active'); 
                analizEt(); 
            });
        });

        analizEt(); 
    }
    else if(aktifSekme === "hedef") { 
        document.getElementById('hedefPanel').style.display = "block"; 
        let dNolar = Object.keys(db).filter(k => k !== 'meta' && k !== 'lastUpdated').flatMap(d => Object.keys(db[d]||{})).map(Number);
        document.getElementById('hedefDenemeNo').value = dNolar.length ? Math.max(...dNolar) : 1; 
        listeleGecmis(); 
        runAIPrediction(); // Yeni Yapay Zeka Özelliği Tetiklemesi
    }
    else if(aktifSekme === "grafik") { 
        document.getElementById('grafikPanel').style.display = "block"; 
        const c = document.getElementById('grafikFiltreler');
        c.innerHTML = '';
        
        const genBtn = document.createElement('button');
        genBtn.className = `pill-btn ${aktifGrafikFiltre==='Genel'?'active':''}`;
        genBtn.textContent = 'Genel Toplam';
        genBtn.addEventListener('click', () => { aktifGrafikFiltre = 'Genel'; gosterSekme(); });
        c.appendChild(genBtn);

        Object.keys(müfredat).forEach(d => {
            const btn = document.createElement('button');
            btn.className = `pill-btn ${aktifGrafikFiltre===d?'active':''}`;
            btn.textContent = d;
            btn.addEventListener('click', () => { aktifGrafikFiltre = d; gosterSekme(); });
            c.appendChild(btn);
        });
        
        cizGrafik(); 
    }
}

// ============================================================================
// 8. VERİ GİRİŞ (DERS) PANELİ - DOM OPTİMİZASYONLU (innerHTML yorulmaz)
// ============================================================================
function renderPanel() {
    const mainContent = document.getElementById('mainContent');
    let hepsiSecili = true;
    
    // Yalnızca iskeleti bir kere innerHTML ile basıyoruz
    let html = `
        <div class="panel active">
            <div class="deneme-header">
                <h2>${aktifDers} <span class="fs-14 text-muted fw-normal">(Limit: ${SORU_LIMITLERI[aktifDers]})</span></h2>
                <div class="deneme-controls">
                    <button id="btnPrevDnm" class="btn-primary"><i class="fas fa-chevron-left"></i></button>
                    <input type="number" id="denemeNoInput" value="${aktifDenemeNo}" min="1">
                    <button id="btnNextDnm" class="btn-primary"><i class="fas fa-chevron-right"></i></button>
                    <button id="btnSilDnm" class="btn-danger"><i class="fas fa-trash"></i> Sil</button>
                </div>
            </div>
            
            <div class="meta-inputs">
                <label class="fs-14 fw-bold"><i class="fas fa-calendar-alt"></i> Tarih:</label>
                <input type="date" id="dnmTarih" value="${db.meta?.[aktifDenemeNo]?.tarih || ''}" style="width:130px;">
                <label class="fs-14 fw-bold ml-15"><i class="fas fa-stopwatch"></i> Süre (Dk):</label>
                <input type="number" id="dnmSure" placeholder="130" value="${db.meta?.[aktifDenemeNo]?.sure || ''}" style="width:70px;">
            </div>
            
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th style="width:50px;"><input type="checkbox" id="anaCheckbox" checked></th>
                            <th>Konu Adı</th>
                            <th>Doğru</th>
                            <th>Yanlış</th>
                            <th>Net</th>
                        </tr>
                    </thead>
                    <tbody id="dersTbody"></tbody>
                    <tfoot>
                        <tr style="background: rgba(0,0,0,0.05); font-weight:bold;">
                            <td colspan="2" style="text-align:right;">GENEL TOPLAM:</td>
                            <td id="tdTopD">0</td>
                            <td id="tdTopY">0</td>
                            <td id="tdTopNet" class="text-primary">Net: 0 | Boş: 0</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>`;
    
    mainContent.innerHTML = html;

    // DOM Elementlerini seç
    const tbody = document.getElementById('dersTbody');
    const anaCb = document.getElementById('anaCheckbox');
    
    // Üst Kontrol Butonları Eventleri
    document.getElementById('btnPrevDnm').addEventListener('click', () => { aktifDenemeNo = Math.max(1, aktifDenemeNo - 1); renderPanel(); });
    document.getElementById('btnNextDnm').addEventListener('click', () => { aktifDenemeNo++; renderPanel(); });
    document.getElementById('denemeNoInput').addEventListener('change', (e) => { aktifDenemeNo = Math.max(1, parseInt(e.target.value) || 1); renderPanel(); });
    document.getElementById('btnSilDnm').addEventListener('click', () => { document.getElementById('silModal').style.display = 'flex'; });
    
    document.getElementById('dnmTarih').addEventListener('change', (e) => {
        if(!db.meta) db.meta = {}; 
        if(!db.meta[aktifDenemeNo]) db.meta[aktifDenemeNo] = {};
        db.meta[aktifDenemeNo].tarih = e.target.value; 
        kaydet();
    });
    
    document.getElementById('dnmSure').addEventListener('change', (e) => {
        if(!db.meta) db.meta = {}; 
        if(!db.meta[aktifDenemeNo]) db.meta[aktifDenemeNo] = {};
        db.meta[aktifDenemeNo].sure = e.target.value; 
        kaydet();
    });

    // Satırları Node oluşturarak ekle (Güvenli XSS Önlemi ve Performans)
    müfredat[aktifDers].forEach((kAd) => {
        let data = db[aktifDers]?.[aktifDenemeNo]?.[kAd] || {d:0, y:0, s:true}; 
        let s = data.s === undefined ? true : data.s; 
        if(!s) hepsiSecili = false;
        
        let net = (data.d || 0) - ((data.y || 0) / 4); 
        
        const tr = document.createElement('tr');
        if(!s) tr.className = 'pasif-satir';

        // Checkbox Cell
        const tdCb = document.createElement('td');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = s;
        tdCb.appendChild(cb);

        // Name Cell (XSS Koruması: textContent)
        const tdName = document.createElement('td');
        tdName.textContent = kAd;

        // Doğru Input
        const tdD = document.createElement('td');
        const inpD = document.createElement('input');
        inpD.type = 'number'; inpD.min = 0; inpD.value = data.d; inpD.disabled = !s;
        tdD.appendChild(inpD);

        // Yanlış Input
        const tdY = document.createElement('td');
        const inpY = document.createElement('input');
        inpY.type = 'number'; inpY.min = 0; inpY.value = data.y; inpY.disabled = !s;
        tdY.appendChild(inpY);

        // Net Cell
        const tdNet = document.createElement('td');
        tdNet.className = 'fw-600';
        tdNet.textContent = s ? net.toFixed(2) : '-';
        if(s && net < 0) tdNet.style.color = 'var(--alert-color)';

        tr.append(tdCb, tdName, tdD, tdY, tdNet);
        tbody.appendChild(tr);

        // Akıllı Event Listenerlar (Tüm tabloyu yeniden çizmeyen DOM manipülasyonu)
        cb.addEventListener('change', (e) => {
            let isChecked = e.target.checked;
            veriNesnesiOlustur(kAd);
            db[aktifDers][aktifDenemeNo][kAd].s = isChecked;
            kaydet();
            
            tr.className = isChecked ? '' : 'pasif-satir';
            inpD.disabled = inpY.disabled = !isChecked;
            guncelleSatirArayuz(kAd, inpD.value, inpY.value, isChecked, tdNet);
            hesaplaAltToplam();
        });

        const handleInput = (tur, val) => {
            let deger = Math.max(0, parseInt(val) || 0);
            if(kontrolSoruLimiti(kAd, tur, deger)) {
                veriNesnesiOlustur(kAd);
                db[aktifDers][aktifDenemeNo][kAd][tur] = deger;
                kaydet();
                guncelleSatirArayuz(kAd, inpD.value, inpY.value, cb.checked, tdNet);
                hesaplaAltToplam();
            } else {
                tur === 'd' ? inpD.value = data.d : inpY.value = data.y; // Geri al
            }
        };

        inpD.addEventListener('input', (e) => handleInput('d', e.target.value));
        inpY.addEventListener('input', (e) => handleInput('y', e.target.value));
    });

    anaCb.checked = hepsiSecili;
    anaCb.addEventListener('change', (e) => {
        let isChecked = e.target.checked;
        müfredat[aktifDers].forEach(kAd => {
            veriNesnesiOlustur(kAd);
            db[aktifDers][aktifDenemeNo][kAd].s = isChecked;
        });
        kaydet();
        renderPanel(); // Tümü seçilirse bir kereliğine toplu render
    });

    hesaplaAltToplam(); // İlk yüklemede toplamları hesapla
}

// Yardımcı DOM Veri Fonksiyonları
function veriNesnesiOlustur(kAd) {
    if(!db[aktifDers]) db[aktifDers] = {}; 
    if(!db[aktifDers][aktifDenemeNo]) db[aktifDers][aktifDenemeNo] = {}; 
    if(!db[aktifDers][aktifDenemeNo][kAd]) db[aktifDers][aktifDenemeNo][kAd] = {d:0, y:0, s:true};
}

function guncelleSatirArayuz(kAd, d, y, s, tdNet) {
    let dVal = parseInt(d)||0, yVal = parseInt(y)||0;
    let net = dVal - (yVal/4);
    tdNet.textContent = s ? net.toFixed(2) : '-';
    tdNet.style.color = (s && net < 0) ? 'var(--alert-color)' : '';
}

function kontrolSoruLimiti(aktifKonu, tur, yeniDeger) {
    let digerTop = 0; 
    müfredat[aktifDers].forEach(k => { 
        let s = db[aktifDers]?.[aktifDenemeNo]?.[k]?.s; 
        if (s !== false) { 
            if(k !== aktifKonu) {
                digerTop += (Number(db[aktifDers]?.[aktifDenemeNo]?.[k]?.d || 0) + Number(db[aktifDers]?.[aktifDenemeNo]?.[k]?.y || 0)); 
            } else {
                digerTop += Number(tur === 'd' ? (db[aktifDers]?.[aktifDenemeNo]?.[k]?.y || 0) : (db[aktifDers]?.[aktifDenemeNo]?.[k]?.d || 0)); 
            }
        } 
    });
    if((digerTop + yeniDeger) > SORU_LIMITLERI[aktifDers]) { 
        showToast(`${aktifDers} maks ${SORU_LIMITLERI[aktifDers]} soru olabilir!`); 
        return false;
    }
    return true;
}

function hesaplaAltToplam() {
    let topD = 0, topY = 0;
    müfredat[aktifDers].forEach((kAd) => {
        let data = db[aktifDers]?.[aktifDenemeNo]?.[kAd];
        if(data && data.s !== false) {
            topD += parseInt(data.d)||0;
            topY += parseInt(data.y)||0;
        }
    });
    let topNet = topD - (topY/4);
    document.getElementById('tdTopD').textContent = `D: ${topD}`;
    document.getElementById('tdTopY').textContent = `Y: ${topY}`;
    document.getElementById('tdTopNet').textContent = `Net: ${topNet.toFixed(2)} | Boş: ${SORU_LIMITLERI[aktifDers]-(topD+topY)}`;
}

// ============================================================================
// 9. AKILLI ANALİZ MOTORU & TRAFİK LAMBASI
// ============================================================================
function analizEt() {
    const dZayif = document.getElementById('analizZayif');
    const dGelistir = document.getElementById('analizGelistir');
    const dBasarili = document.getElementById('analizBasarili');
    const dRadar = document.getElementById('analizPaslananIcerik');

    if(!dZayif || !dGelistir || !dBasarili || !dRadar) return;

    dZayif.innerHTML = ''; dGelistir.innerHTML = ''; dBasarili.innerHTML = ''; dRadar.innerHTML = '';
    
    let denemeNolar = new Set(); 
    Object.keys(db).forEach(d => { 
        if(d !== 'meta' && d !== 'lastUpdated') {
            Object.keys(db[d]).forEach(no => denemeNolar.add(parseInt(no)));
        }
    });
    
    let sirali = Array.from(denemeNolar).sort((a,b) => a-b); 
    
    // Boş Ekran Tasarımı (Empty State) XSS güvenli olarak eklendi
    const emptyStateHTML = `
        <div class="empty-state">
            <i class="fas fa-folder-open"></i>
            <p>Hadi ilk denemeni ekleyerek analizlere başlayalım!</p>
        </div>`;

    if(sirali.length === 0) {
        document.querySelector('.analiz-grid-3').innerHTML = emptyStateHTML;
        dRadar.innerHTML = '<p class="text-muted">Veri bulunamadı.</p>';
        return;
    }

    // Grid yapısını onar (Empty state varsa silindiği için)
    if(document.querySelector('.analiz-grid-3 .empty-state')) {
        gosterSekme(); // Arayüzü sıfırla
        return;
    }

    let analizEdilecekler = aktifAnalizFiltresi === 0 ? sirali : sirali.slice(-aktifAnalizFiltresi); 
    let son3 = sirali.slice(-3);
    let ders = aktifAnalizDersi; 
    let dC = false; 
    
    müfredat[ders].forEach(k => {
        let yS = 0, dS = 0, bS = 0, sS = 0;
        let dIlk = 0, yIlk = 0, bIlk = 0;
        let dSon = 0, ySon = 0, bSon = 0;
        let mid = Math.floor(analizEdilecekler.length / 2);
        
        analizEdilecekler.forEach((dNo, i) => {
            if (!db[ders] || !db[ders][dNo]) return; 
            dC = true; 
            
            let data = db[ders][dNo][k]; 
            let s = data === undefined ? true : data.s;
            
            if(s) { 
                sS++; 
                let d = Number(data?.d || 0);
                let y = Number(data?.y || 0); 
                let b = (d === 0 && y === 0) ? 1 : 0; 
                
                bS += b; yS += y; dS += d; 
                
                if(i < mid) { dIlk += d; yIlk += y; bIlk += b; } 
                else { dSon += d; ySon += y; bSon += b; } 
            }
        });
        
        let tI = "";
        let toplamIlk = dIlk + yIlk + bIlk;
        let toplamSon = dSon + ySon + bSon;
        
        if(analizEdilecekler.length >= 2 && toplamIlk > 0 && toplamSon > 0) { 
            let ortIlk = (dIlk / toplamIlk) * 100;
            let ortSon = (dSon / toplamSon) * 100;
            if(ortSon > ortIlk) {
                tI = " <span class='text-success fw-bold fs-13' title='Yükselişte'><i class='fas fa-arrow-trend-up'></i></span>"; 
            } else if(ortSon < ortIlk) {
                tI = " <span class='text-danger fw-bold fs-13' title='Düşüşte'><i class='fas fa-arrow-trend-down'></i></span>"; 
            }
        }
        
        let toplamSorulan = dS + yS + bS;
        if(sS > 0 && toplamSorulan > 0) {
            let isabet = (dS / toplamSorulan) * 100;
            
            // XSS ve Güvenli Render için Element Oluşturma
            const itemDiv = document.createElement('div');
            itemDiv.className = 'analiz-item';
            
            const textDiv = document.createElement('div');
            textDiv.innerHTML = `<strong>${k}</strong>${tI} <div class="fs-13 text-muted mt-5">${sS} Sınav: ${dS}D, ${yS}Y, ${bS}B</div>`;
            
            const percDiv = document.createElement('div');
            percDiv.className = 'fw-bold fs-18';
            percDiv.textContent = `%${isabet.toFixed(0)}`;
            
            itemDiv.append(textDiv, percDiv);
            
            if(isabet < 50) dZayif.appendChild(itemDiv);
            else if(isabet < 85) dGelistir.appendChild(itemDiv);
            else dBasarili.appendChild(itemDiv);
        }

        if(son3.length >= 3) {
            let hc = true; 
            son3.forEach(dNo => { 
                if (!db[ders] || !db[ders][dNo]) return; 
                let data = db[ders][dNo][k]; 
                let s = data === undefined ? true : data.s; 
                if(s) hc = false; 
            });
            
            if(hc && dC) { 
                const rItem = document.createElement('div');
                rItem.className = 'radar-item';
                rItem.innerHTML = `<strong>${k}</strong> <span class="fs-13 text-muted block mt-5"><i class="fas fa-exclamation-triangle"></i> Son 3 denemedir atlanıyor. Mutlaka tekrar yap!</span>`;
                dRadar.appendChild(rItem);
            }
        }
    });
    
    if(!dC) { 
        dZayif.innerHTML = dGelistir.innerHTML = dBasarili.innerHTML = `<div class="p-15 text-muted">Bu ders için veri yok.</div>`; 
    } else {
        if(dZayif.childElementCount === 0) dZayif.innerHTML = `<div class="p-15 text-success fw-600"><i class="fas fa-check-circle"></i> Zayıf konu yok!</div>`;
        if(dGelistir.childElementCount === 0) dGelistir.innerHTML = `<div class="p-15 text-success fw-600"><i class="fas fa-check-circle"></i> Geliştirilecek konu kalmadı!</div>`;
        if(dBasarili.childElementCount === 0) dBasarili.innerHTML = `<div class="p-15 text-muted"><i class="fas fa-hourglass-half"></i> Henüz %85 başarı yok.</div>`;
    }

    if(dRadar.childElementCount === 0) {
        dRadar.innerHTML = `<p class="text-success fw-bold p-10 m-0"><i class="fas fa-shield-alt"></i> Harika! Bu derste paslanmış bir konu bulunmuyor.</p>`;
    }
}

// ============================================================================
// 10. YENİ ÖZELLİK: YAPAY ZEKA TAHMİNE DAYALI ANALİZ (Linear Regression)
// ============================================================================
function runAIPrediction() {
    const aiText = document.getElementById('aiPredictionText');
    if(!aiText) return;

    let denemeler = Object.keys(db).filter(k => k !== 'meta' && k !== 'lastUpdated').flatMap(d => Object.keys(db[d]||{})).map(Number);
    let uniqueDenemeler = [...new Set(denemeler)].sort((a,b) => a-b);
    
    if(uniqueDenemeler.length < 5) {
        aiText.textContent = "Yapay zekanın sağlıklı bir tahmin yapabilmesi için en az 5 deneme verisine ihtiyacı var.";
        return;
    }

    let son5 = uniqueDenemeler.slice(-5);
    let xData = [];
    let yDataGY = [];
    let yDataGK = [];

    // Verileri Topla
    son5.forEach((dNo, index) => {
        xData.push(index + 1); // 1, 2, 3, 4, 5
        let gyNet = 0, gkNet = 0;
        
        Object.keys(müfredat).forEach(ders => {
            let dersNet = 0;
            müfredat[ders].forEach(k => {
                let data = db[ders]?.[dNo]?.[k];
                if(!data || data.s !== false) {
                    let d = data?.d || 0;
                    let y = data?.y || 0;
                    dersNet += (d - (y / 4));
                }
            });
            if(ders === "Türkçe" || ders === "Matematik") gyNet += dersNet;
            else gkNet += dersNet;
        });
        
        yDataGY.push(gyNet);
        yDataGK.push(gkNet);
    });

    // Basit Lineer Regresyon (En Küçük Kareler Yöntemi)
    const calcLR = (x, y) => {
        let n = x.length;
        let sumX = x.reduce((a,b)=>a+b, 0);
        let sumY = y.reduce((a,b)=>a+b, 0);
        let sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        let sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

        let slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        let intercept = (sumY - slope * sumX) / n;
        return { slope, intercept };
    };

    let lrGY = calcLR(xData, yDataGY);
    let lrGK = calcLR(xData, yDataGK);

    // Bir sonraki adıma (+2 birim süreye) projeksiyon yap
    let nextX = xData.length + 2; 
    let predGY = (lrGY.slope * nextX + lrGY.intercept).toFixed(1);
    let predGK = (lrGK.slope * nextX + lrGK.intercept).toFixed(1);

    // Veri anomali kontrolü (Netler max limiti aşamaz)
    predGY = Math.min(60, Math.max(0, predGY));
    predGK = Math.min(60, Math.max(0, predGK));

    let tavsiye = lrGY.slope <= 0.1 ? "Genel Yetenek ivmen düşük veya durağan, pratikleri artırmalısın." : "Genel Yetenek yükselişin harika, böyle devam et.";
    
    aiText.innerHTML = `Son 5 denemedeki ivmene göre, KPSS sınavına doğru <strong>Genel Yetenek netin ortalama ${predGY}'e</strong>, <strong>Genel Kültür netin ${predGK}'ye</strong> ulaşacak. ${tavsiye}`;
}

// ============================================================================
// 11. GEÇMİŞ DENEMELER VE EXPORT
// ============================================================================
function listeleGecmis() {
    const div = document.getElementById('gecmisIcerik'); 
    let dNolar = new Set(); 
    
    Object.keys(db).forEach(d => { 
        if(d !== 'meta' && d !== 'lastUpdated') {
            Object.keys(db[d]).forEach(no => dNolar.add(parseInt(no)));
        }
    });
    
    let sirali = Array.from(dNolar).sort((a,b) => a-b); 
    if(sirali.length === 0) {
        div.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-file-excel"></i>
            <p>Geçmiş deneme kaydı bulunamadı.</p>
        </div>`;
        return;
    }

    let tS = 0, sSayisi = 0;
    
    // Tablo (Masaüstü için table, Mobil için CSS ile karta dönüşür)
    let html = `<table><thead><tr>
        <th>No</th><th>Tarih</th><th>Süre</th><th>Türkçe</th><th>Matematik</th>
        <th>Tarih</th><th>Coğrafya</th><th>Vatandaşlık</th><th>GY Net</th><th>GK Net</th><th>Toplam</th>
        </tr></thead><tbody>`;
        
    sirali.forEach(dNo => {
        let net = {}; 
        Object.keys(müfredat).forEach(ders => { 
            let dN = 0; 
            müfredat[ders].forEach(k => { 
                let data = db[ders]?.[dNo]?.[k]; 
                if(!data || data.s !== false) { dN += ((data?.d || 0) - ((data?.y || 0) / 4)); }
            }); 
            net[ders] = dN; 
        });
        
        let gy = net["Türkçe"] + net["Matematik"]; 
        let gk = net["Tarih"] + net["Coğrafya"] + net["Vatandaşlık"]; 
        let tNet = gy + gk;
        
        let tarih = db.meta?.[dNo]?.tarih ? new Date(db.meta[dNo].tarih).toLocaleDateString('tr-TR') : '-';
        let sure = db.meta?.[dNo]?.sure || '-'; 
        
        if(sure !== '-') { tS += parseInt(sure); sSayisi++; }
        
        html += `<tr>
            <td data-label="No"><strong>${dNo}</strong></td>
            <td data-label="Tarih">${tarih}</td>
            <td data-label="Süre">${sure} dk</td>
            <td data-label="Türkçe">${net["Türkçe"].toFixed(2)}</td>
            <td data-label="Matematik">${net["Matematik"].toFixed(2)}</td>
            <td data-label="Tarih">${net["Tarih"].toFixed(2)}</td>
            <td data-label="Coğrafya">${net["Coğrafya"].toFixed(2)}</td>
            <td data-label="Vatandaşlık">${net["Vatandaşlık"].toFixed(2)}</td>
            <td data-label="GY Net" class="text-primary fw-bold">${gy.toFixed(2)}</td>
            <td data-label="GK Net" class="text-primary fw-bold">${gk.toFixed(2)}</td>
            <td data-label="Toplam" class="fw-bold" style="color:var(--success-color);">${tNet.toFixed(2)}</td>
        </tr>`;
    });
    
    div.innerHTML = html + `</tbody></table>`;
    
    let sureYorum = "";
    const zamanAlani = document.getElementById('zamanAnaliziAlani');
    if(sSayisi > 0) {
        let ort = Math.round(tS / sSayisi);
        if(ort <= 130) { sureYorum = `<span class="text-success"><i class="fas fa-check-circle"></i> Sınav süresine (130dk) göre harika ilerliyorsun!</span>`; } 
        else { sureYorum = `<span class="text-danger"><i class="fas fa-exclamation-triangle"></i> Sınav süresini aşıyorsun, hızlanmalısın.</span>`; }
        zamanAlani.innerHTML = `⏱️ Ortalama Süren: <strong>${ort} Dakika</strong> | ${sureYorum}`;
        zamanAlani.classList.remove('d-none');
    } else {
        zamanAlani.classList.add('d-none');
    }
}

function raporIndirCSV() {
    let csv = "data:text/csv;charset=utf-8,\uFEFFDeneme No,Tarih,Sure (Dk),Turkce,Matematik,Tarih,Cografya,Vatandaslik,GY Net,GK Net,Toplam Net\n";
    let dNolar = new Set(); 
    
    Object.keys(db).forEach(d => { 
        if(d !== 'meta' && d !== 'lastUpdated') { Object.keys(db[d]).forEach(no => dNolar.add(parseInt(no))); }
    });
    
    Array.from(dNolar).sort((a,b) => a-b).forEach(dNo => {
        let tarih = db.meta?.[dNo]?.tarih || "-"; 
        let sure = db.meta?.[dNo]?.sure || "-"; 
        let net = {};
        
        Object.keys(müfredat).forEach(ders => { 
            let dN = 0; 
            müfredat[ders].forEach(k => { 
                let data = db[ders]?.[dNo]?.[k]; 
                if(!data || data.s !== false) dN += ((data?.d || 0) - ((data?.y || 0) / 4)); 
            }); 
            net[ders] = dN; 
        });
        
        let gy = net["Türkçe"] + net["Matematik"], gk = net["Tarih"] + net["Coğrafya"] + net["Vatandaşlık"];
        csv += `${dNo},${tarih},${sure},${net["Türkçe"].toFixed(1)},${net["Matematik"].toFixed(1)},${net["Tarih"].toFixed(1)},${net["Coğrafya"].toFixed(1)},${net["Vatandaşlık"].toFixed(1)},${gy.toFixed(1)},${gk.toFixed(1)},${(gy+gk).toFixed(1)}\n`;
    });
    
    let link = document.createElement("a"); link.setAttribute("href", encodeURI(csv)); 
    link.setAttribute("download", "KPSS_Deneme_Raporu.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

// ============================================================================
// 12. SVG GRAFİK ÇİZİMİ
// ============================================================================
function cizGrafik() {
    const wrap = document.getElementById('svgChartWrapper'); 
    let dNolar = new Set(); 
    
    Object.keys(db).forEach(d => { 
        if(d !== 'meta' && d !== 'lastUpdated') { Object.keys(db[d]).forEach(no => dNolar.add(parseInt(no))); }
    });
    
    let sirali = Array.from(dNolar).sort((a,b) => a-b); 
    
    if(sirali.length === 0) {
        wrap.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-chart-line"></i>
            <p>Grafik çizmek için veri bekleniyor.</p>
        </div>`;
        return;
    }
    
    let data = sirali.map(dNo => {
        let topN = 0, varMi = false;
        Object.keys(db).forEach(ders => { 
            if(ders !== 'meta' && ders !== 'lastUpdated' && (aktifGrafikFiltre === "Genel" || ders === aktifGrafikFiltre)) { 
                müfredat[ders].forEach(k => { 
                    let data = db[ders]?.[dNo]?.[k]; 
                    if (!data || data.s !== false) { 
                        if((data?.d || 0) > 0 || (data?.y || 0) > 0) varMi = true; 
                        topN += ((data?.d || 0) - ((data?.y || 0) / 4)); 
                    } 
                }); 
            } 
        });
        return { x: dNo, y: varMi ? topN : null };
    }).filter(pt => pt.y !== null);
    
    if(data.length === 0) return wrap.innerHTML = '<p class="text-center text-muted">Filtreye uygun veri yok.</p>';
    
    const w = wrap.clientWidth || 800, h = 300, pad = 40; 
    let maxN = Math.max(...data.map(d => d.y), 10), minN = Math.min(...data.map(d => d.y), 0);
    
    let targetTotal = 0; 
    if(aktifGrafikFiltre === "Genel" && currentUid) {
        targetTotal = (parseFloat(localStorage.getItem(`gy_target_${currentUid}`)) || 0) + (parseFloat(localStorage.getItem(`gk_target_${currentUid}`)) || 0);
    }
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
        svg += `<text x="${w-pad+5}" y="${tY+4}" fill="var(--success-color)" font-size="12" font-weight="bold">Hedef</text>`; 
    }
    
    let pD = "", circs = ""; 
    data.forEach((pt, i) => {
        let cx = pad + (i * xB), cy = h - pad - ((pt.y - minN) * yB); 
        pD += (i === 0) ? `M ${cx} ${cy} ` : `L ${cx} ${cy} `;
        svg += `<text x="${cx}" y="${h-pad+20}" fill="${mRengi}" font-size="12" text-anchor="middle">${pt.x}.Dnm</text>`;
        circs += `<circle cx="${cx}" cy="${cy}" r="5" fill="var(--card-bg)" stroke="var(--primary-color)" stroke-width="2"></circle>`;
        circs += `<text x="${cx}" y="${cy-12}" fill="var(--primary-color)" font-size="12" font-weight="bold" text-anchor="middle">${pt.y.toFixed(1)}</text>`;
    }); 
    
    wrap.innerHTML = svg + `<path d="${pD}" fill="none" stroke="var(--primary-color)" stroke-width="3" stroke-linecap="round"></path>${circs}</svg>`;
}
