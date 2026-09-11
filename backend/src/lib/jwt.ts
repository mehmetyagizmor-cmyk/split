import jwt from "jsonwebtoken";

// Modül seviyesindeki `if` kontrolü TS'e "artık string" olduğunu fonksiyon
// gövdelerinin içine kadar taşıyamıyor (control-flow narrowing fonksiyon
// sınırını geçmiyor); bu yüzden kontrolü bir IIFE içinde yapıp sonucu
// kesin `string` tipiyle sabitliyoruz.
const JWT_SECRET: string = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Uygulama, gizli anahtar olmadan asla ayağa kalkmamalı — sessizce
    // varsayılan bir değerle devam etmek ciddi bir güvenlik açığı olurdu.
    throw new Error("JWT_SECRET .env dosyasında tanımlı değil");
  }
  return secret;
})();

const JWT_EXPIRES_IN = "8h";

export type AuthTokenPayload = {
  userId: string;
  restaurantId: string;
  role: "ADMIN" | "STAFF";
};

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  // jsonwebtoken'ın dönüş tipi geniş (string | JwtPayload | Jwt); imzaladığımız
  // payload'ın şeklini kendimiz bildiğimiz için `unknown` üzerinden cast ediyoruz.
  return jwt.verify(token, JWT_SECRET) as unknown as AuthTokenPayload;
}
