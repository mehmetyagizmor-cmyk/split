// Hem staff/admin token'ları (jwt.ts) hem müşteri token'ları (customerToken.ts)
// aynı gizli anahtarı kullanıyor. Modül seviyesindeki `if` kontrolü TS'e "artık
// string" olduğunu fonksiyon gövdelerinin içine kadar taşıyamadığı için
// (control-flow narrowing fonksiyon sınırını geçmiyor) kontrolü bir IIFE
// içinde yapıp sonucu kesin `string` tipiyle sabitliyoruz.
export const JWT_SECRET: string = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Uygulama, gizli anahtar olmadan asla ayağa kalkmamalı — sessizce
    // varsayılan bir değerle devam etmek ciddi bir güvenlik açığı olurdu.
    throw new Error("JWT_SECRET .env dosyasında tanımlı değil");
  }
  return secret;
})();
