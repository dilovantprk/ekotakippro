# ekotakippro | Türkiye İklim Zekası & Karbon Portalı

Bu proje, kurumsal etkinliklerin sera gazı emisyonlarını hesaplamak amacıyla bağımsız olarak geliştirilmiş bir Karbon Ayak İzi Hesaplayıcısı web uygulamasıdır.

## 🚀 Öne Çıkan Özellikler

1. **4-Kategorili Etkinlik Karbon Hesaplayıcısı**:
   - **Kategori 1 - Seyahat & Lojistik**: Uçuş mesafesi (Ekonomi / Business çarpanı), Şehir içi transfer ve Lojistik kargo (ton-km).
   - **Kategori 2 - Tesis & Enerji**: Tesis alanı (m²), Şebeke elektriği (kWh) ve Otel konaklamaları.
   - **Kategori 3 - İkram & Gıda (Catering)**: Kırmızı Et, Tavuk/Balık ve Vejetaryen/Vegan menü seçimi.
   - **Kategori 4 - Malzeme & Atık**: Sahne/vinil branda alanı (m²) ve promosyon ürün sayısı.
   - **Sektörel Referans Değeri Karşılaştırması**: Tesis alanı ve katılımcı bazlı kıyaslama ve tasarruf hesabı.
   - **Yazdırılabilir PDF Raporu**: Tek tıkla çıktı alınabilir kurumsal emisyon raporu.

2. **Gelişmiş Arayüz & Özellikler**:
   - **Apple HIG Tasarım Sistemi**: Koyu & Açık mod (Dark / Light Theme).
   - **Yerel Depolama (localStorage)**: Beyannamelerin cihazda güvenle saklanması ve CSV/JSON dışa aktarımı.
   - **Sıfır Kişisel Veri (Zero-PII)**: Tüm veriler yalnızca kullanıcının cihazında işlenir ve saklanır.

## 🛠️ Yerel Olarak Çalıştırma

Uygulamayı herhangi bir HTTP sunucusu ile çalıştırabilirsiniz:

```bash
# Python ile çalıştırma:
python3 -m http.server 8080

# veya npx serve ile:
npx -y serve ./
```

Tarayıcıda `http://localhost:8080` adresine girerek uygulamayı kullanabilirsiniz.
