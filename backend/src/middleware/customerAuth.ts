import type { NextFunction, Request, Response } from "express";
import { verifyCustomerToken } from "../lib/customerToken";
import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/errors";

export const CUSTOMER_COOKIE_NAME = "customer_token";

/**
 * requireAuth'un müşteri karşılığı. Farkı: JWT'yi doğrulamakla yetinmiyor,
 * her istekte veritabanına bakıp CustomerSession'ın bağlı olduğu Bill'in
 * hâlâ OPEN olduğunu doğruluyor. Neden gerekli: JWT'nin kendi süresi 12
 * saat ama masa çok daha önce (herkes ödeyip) kapanmış olabilir — sadece
 * token süresine güvenirsek, hesabı kapanmış bir müşteri saatlerce
 * "hâlâ oturumu açık" görünürdü.
 */
export async function requireCustomerSession(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const token = req.cookies?.[CUSTOMER_COOKIE_NAME];
  if (!token) {
    throw new ApiError(401, "Önce masaya katılmanız gerekiyor");
  }

  let payload;
  try {
    payload = verifyCustomerToken(token);
  } catch {
    throw new ApiError(401, "Oturum geçersiz veya süresi dolmuş");
  }

  const session = await prisma.customerSession.findUnique({
    where: { id: payload.customerSessionId },
    select: {
      id: true,
      name: true,
      billId: true,
      restaurantId: true,
      bill: { select: { status: true, tableId: true } },
    },
  });

  if (!session || session.bill.status !== "OPEN") {
    throw new ApiError(401, "Oturumunuzun süresi doldu, masaya tekrar katılın");
  }

  req.customerSession = {
    customerSessionId: session.id,
    name: session.name,
    billId: session.billId,
    tableId: session.bill.tableId,
    restaurantId: session.restaurantId,
  };

  next();
}
