# Split — Masada Kişisel & Ortak Hesap Uygulaması

QR ile masaya katılan müşterilerin kendi siparişlerini verip kişisel hesaplarını
görebildiği, ortak ürünleri paylaşabildiği ve restoran personelinin masa/sipariş
yönetimi yapabildiği web uygulaması.

## Klasör Yapısı

```
split/
├── backend/   → Node.js + Express + TypeScript API
└── frontend/  → React + Vite + TypeScript + Tailwind CSS
```

Backend ve frontend birbirinden bağımsız iki npm projesidir.

## Geliştirme

**Backend:**

```bash
cd backend
npm install
npm run dev   # http://localhost:4000
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

## Testler

Backend, gerçek (dev) Neon veritabanına karşı çalışan bir entegrasyon test paketine
sahip — kendi izole test verisini oluşturup sonunda temizler, "Demo Cafe" seed
verisine dokunmaz.

```bash
cd backend
npm test
```

## Production Dağıtım Kontrol Listesi

Deploy etmeden önce:

1. **Backend ortam değişkenleri** (Render vb. hosting panelinden ayarlanır):
   - `NODE_ENV=production` — cookie güvenlik ayarları (`secure`, `sameSite`) buna göre değişiyor, unutulursa oturum/giriş hiç çalışmaz.
   - `JWT_SECRET` — rastgele, güçlü, geliştirmedekinden **farklı** bir değer.
   - `FRONTEND_URL` — gerçek frontend domain'i (örn. `https://split.vercel.app`, sonunda `/` olmadan).
   - `DATABASE_URL` / `DIRECT_URL` — Neon'un production branch'i (ya da ayrı bir production veritabanı).
2. **Frontend ortam değişkeni** (Vercel panelinden, **build'den önce**): `VITE_API_URL=/api` (göreli yol — backend'in tam URL'i DEĞİL). Vite bunu build anında koda gömüyor, sonradan değiştirmek yeniden build gerektirir.
   - **Neden göreli yol?** Backend'e doğrudan farklı bir domain'den (örn. `onrender.com`) istek atılırsa, tarayıcılar (özellikle **Safari**, Intelligent Tracking Prevention ile) oturum çerezini "üçüncü taraf çerez" sayıp tamamen engelliyor — kullanıcı isim girip masaya katılsa bile bir sonraki sayfada tekrar isim formuna düşüyor. Çözüm: `frontend/vercel.json`'daki rewrite kuralları `/api/*` ve `/socket.io/*` isteklerini arka planda gerçek backend'e yönlendiriyor; tarayıcı hep kendi (Vercel) domain'iyle konuştuğunu sanıyor, çerez birinci taraf gibi davranıyor.
3. **Veritabanı migration'ı**: `prisma migrate dev` yerine `npm run db:migrate:deploy` kullanılmalı (etkileşimli olmayan, production için güvenli komut).
4. **Build**: backend `npm run build`, frontend `npm run build` — ikisi de hatasız tamamlanmalı.
5. Frontend'in statik hosting'de (Vercel) client-side routing'in çalışması için `frontend/vercel.json` zaten hazır.
6. **Render (ya da benzeri) Build Command'ı**: `NODE_ENV=production` ortam değişkeni build sırasında da geçerli olduğu için, `npm install` devDependencies'i (TypeScript tip tanımları, `prisma` CLI vb.) atlayabilir ve `tsc` "Could not find a declaration file" hatasıyla başarısız olur. Build Command'ı şu şekilde ayarla:
   ```
   npm install --include=dev && npm run build
   ```

## Canlı Ortam

- **Frontend (Vercel):** https://split-swart-alpha.vercel.app
- **Backend (Render):** https://split-j2yj.onrender.com

Demo giriş bilgileri (`/staff/login`): `admin@demo-cafe.com` / `admin123` (ADMIN), `staff@demo-cafe.com` / `staff123` (STAFF).

> Not: Backend ücretsiz Render planında çalışıyor — birkaç dakika kullanılmazsa "uykuya" geçer, tekrar bir istek geldiğinde uyanması ~30-60 saniye sürebilir. Bu bir hata değil, ücretsiz planın doğal davranışı.

## Proje Durumu

Geliştirme aşamalı (phase'ler halinde) yürütülüyor. Şu an: **Phase 18 — Deployment** tamamlandı, uygulama canlıda.
