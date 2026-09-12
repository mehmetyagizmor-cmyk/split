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
2. **Frontend ortam değişkeni** (Vercel panelinden, **build'den önce**): `VITE_API_URL` gerçek backend URL'ine ayarlanmalı — Vite bunu build anında koda gömüyor, sonradan değiştirmek yeniden build gerektirir.
3. **Veritabanı migration'ı**: `prisma migrate dev` yerine `npm run db:migrate:deploy` kullanılmalı (etkileşimli olmayan, production için güvenli komut).
4. **Build**: backend `npm run build`, frontend `npm run build` — ikisi de hatasız tamamlanmalı.
5. Frontend'in statik hosting'de (Vercel) client-side routing'in çalışması için `frontend/vercel.json` zaten hazır.
6. **Render (ya da benzeri) Build Command'ı**: `NODE_ENV=production` ortam değişkeni build sırasında da geçerli olduğu için, `npm install` devDependencies'i (TypeScript tip tanımları, `prisma` CLI vb.) atlayabilir ve `tsc` "Could not find a declaration file" hatasıyla başarısız olur. Build Command'ı şu şekilde ayarla:
   ```
   npm install --include=dev && npm run build
   ```

## Proje Durumu

Geliştirme aşamalı (phase'ler halinde) yürütülüyor. Şu an: **Phase 17 — Production Hazırlığı** tamamlandı.
