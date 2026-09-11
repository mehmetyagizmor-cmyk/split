import type { AuthTokenPayload } from "../lib/jwt";

/** requireCustomerSession'ın req.customerSession'a yazdığı, DB ile taze doğrulanmış oturum bilgisi. */
export type CustomerSessionContext = {
  customerSessionId: string;
  name: string;
  billId: string;
  tableId: string;
  restaurantId: string;
};

// TypeScript'in "declaration merging" özelliğiyle Express'in kendi Request
// arayüzüne req.user / req.customerSession alanlarını ekliyoruz — böylece
// requireAuth / requireCustomerSession'dan sonra her controller'da bunları
// tip güvenli şekilde kullanabiliyoruz.
declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
      customerSession?: CustomerSessionContext;
    }
  }
}
