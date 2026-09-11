import type { Request, Response } from "express";

/**
 * GET /api/customer/me
 * requireCustomerSession'dan sonra çalışır. Frontend, bir sayfa yüklendiğinde
 * "bu tarayıcı zaten bir masaya katılmış mı?" diye buna sorar — cevap evetse
 * tekrar isim sormadan doğrudan lobiye/menüye geçilir.
 */
export function getCustomerMe(req: Request, res: Response) {
  res.json({ customerSession: req.customerSession });
}
