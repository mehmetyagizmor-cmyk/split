import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./jwtSecret";

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
