import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./jwtSecret";

// Ortalama bir masa oturumu birkaç saat sürebilir (yemek + tatlı + ödeme);
// 12 saat makul bir üst sınır.
const CUSTOMER_TOKEN_EXPIRES_IN = "12h";

export type CustomerTokenPayload = {
  type: "customer"; // staff token'ıyla yanlışlıkla karışmasın diye ayırt edici alan
  customerSessionId: string;
  billId: string;
  tableId: string;
  restaurantId: string;
};

export function signCustomerToken(
  payload: Omit<CustomerTokenPayload, "type">,
): string {
  return jwt.sign({ ...payload, type: "customer" }, JWT_SECRET, {
    expiresIn: CUSTOMER_TOKEN_EXPIRES_IN,
  });
}

export function verifyCustomerToken(token: string): CustomerTokenPayload {
  const decoded = jwt.verify(token, JWT_SECRET) as unknown as CustomerTokenPayload;
  if (decoded.type !== "customer") {
    throw new Error("Geçersiz token tipi");
  }
  return decoded;
}
