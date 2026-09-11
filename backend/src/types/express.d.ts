import type { AuthTokenPayload } from "../lib/jwt";

// TypeScript'in "declaration merging" özelliğiyle Express'in kendi Request
// arayüzüne req.user alanını ekliyoruz — böylece requireAuth'tan sonra
// her controller'da req.user'ı tip güvenli şekilde kullanabiliyoruz.
declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}
