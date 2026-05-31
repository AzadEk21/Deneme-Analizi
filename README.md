# 🎯 KPSS 2026 | Başarı Yönetim ve Analiz Sistemi (KPSS PRO)

Bu proje, KPSS (Kamu Personel Seçme Sınavı) hazırlık sürecini sıradan bir net takibinin ötesine taşıyarak; veriye dayalı kararlar almayı, zayıf/güçlü yönleri algoritmik olarak tespit etmeyi ve yapay zeka (Lineer Regresyon) destekli hedef projeksiyonları sunmayı amaçlayan **saf (Vanilla) JavaScript** tabanlı bir web uygulamasıdır.

---

## ✨ Öne Çıkan Özellikler

### 🧠 Data Science Analiz Motoru & Trafik Lambası Modeli
Sadece netleri toplamakla kalmaz, son 3, son 5 veya tüm geçmiş denemeleri kıyaslayarak konuları 3 ana kategoriye ayırır:
*   🔴 **Zayıf (%50 Altı):** Acil müdahale gerektiren, puan kaybının en çok yaşandığı konular.
*   🟡 **Geliştirilmeli (%50-85):** Temelin olduğu ancak pratik eksiği olan konular.
*   🟢 **Başarılı (%85+):** Şampiyonlar ligi. Sadece tekrarla korunması gereken alanlar.
*   **Kör Nokta Radarı:** Son 3 denemedir pas geçilen veya çözülmeyen konuları tespit edip uyarır.

### 🤖 Yapay Zeka (AI) Hedef Projeksiyonu
En Küçük Kareler Yöntemi (Linear Regression) kullanılarak, kullanıcının son 5 denemedeki ivmesi hesaplanır. Bu sayede bir sonraki sınavlarda Genel Yetenek ve Genel Kültür netlerinin hangi seviyeye ulaşacağı matematiksel olarak tahmin edilir.

### ☁️ Çevrimdışı (Offline-First) ve Bulut Senkronizasyonu
Uygulama, internet koptuğunda dahi çalışmaya devam eder.
*   Veriler anlık olarak `localStorage` üzerinde şifrelenerek tutulur.
*   İnternet bağlantısı sağlandığında **Akıllı Senkronizasyon (Conflict Resolution)** devreye girer. Cihazdaki veri ile buluttaki veri (timestamp) karşılaştırılarak veri ezilmesinin önüne geçilir ve Firebase'e aktarılır.

### 🔐 Güvenli Mimari ve Kimlik Doğrulama
Firebase Authentication entegrasyonu ile her kullanıcı sadece kendi verisine erişebilir. Veritabanı kuralları (Security Rules) ile yetkisiz okuma/yazma işlemleri engellenmiştir.

### 🎨 Modern UI/UX ve Performans
*   Herhangi bir CSS framework'ü kullanılmadan **özel (custom) CSS** ile tasarlanmıştır.
*   Gece/Gündüz (Dark/Light) modu desteği.
*   Gereksiz DOM manipülasyonlarından kaçınılarak yüksek performans hedeflenmiştir.
*   Tüm veriler saniyeler içinde **PDF** veya **CSV (Excel)** formatında dışa aktarılabilir.

---

## 🛠️ Kullanılan Teknolojiler

*   **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
*   **Backend / BaaS:** Firebase (Authentication, Realtime Database)
*   **İkonografi:** FontAwesome 6

---

## 🚀 Bilgisayarınızda (Local) Nasıl Çalıştırırsınız?

Bu proje tamamen "Client-Side" (İstemci Taraflı) çalıştığı için karmaşık sunucu kurulumlarına veya derleyicilere ihtiyaç duymaz. Kendi bilgisayarınızda çalıştırmak için şu adımları izlemeniz yeterlidir:

**1. Dosyaları İndirin:**
Sayfanın sağ üst köşesindeki yeşil **"Code"** butonuna tıklayın ve **"Download ZIP"** seçeneğini seçerek proje dosyalarını bilgisayarınıza indirin. Ardından inen ZIP dosyasını bir klasöre çıkartın.

**2. Firebase Ayarlarınızı Yapın (İsteğe Bağlı):**
Projeyi test etmek için ekstra bir ayar yapmanıza gerek yoktur. Ancak uygulamanın kendi veritabanınıza bağlanmasını istiyorsanız:
* Firebase Console üzerinden yeni bir proje oluşturun.
* Authentication (Email/Password) ve Realtime Database servislerini aktif edin.
* Kendi `firebaseConfig` bilgilerinizi alıp `js/db.js` dosyası içindeki ilgili alana yapıştırın.

**3. Projeyi Tarayıcıda Açın:**
Projede ES6 Modül yapısı (`import/export`) kullanıldığı için `index.html` dosyasına çift tıklayarak açmak tarayıcıların CORS (güvenlik) politikalarına takılabilir. Bu yüzden projeyi bir yerel sunucuda çalıştırmanız gerekir:
* Klasörü **VS Code** ile açın.
* Eklentiler sekmesinden **Live Server** eklentisini kurun.
* Sağ alt köşedeki **"Go Live"** butonuna tıklayarak projeyi saniyeler içinde yerel sunucunuzda (localhost) başlatın.

---

## 👨‍💻 Geliştirici

**Azad**
