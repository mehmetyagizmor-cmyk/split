import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { verifyCustomerToken } from "./customerToken";
import { verifyAuthToken } from "./jwt";
import { prisma } from "./prisma";
import { CUSTOMER_COOKIE_NAME } from "../middleware/customerAuth";
import { AUTH_COOKIE_NAME } from "../middleware/auth";

let ioInstance: Server | null = null;

/** "name=value; name2=value2" formatındaki basit cookie header'ını ayrıştırır. */
function parseCookies(header: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of header.split(";")) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex === -1) continue;
    const name = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();
    result[name] = decodeURIComponent(value);
  }
  return result;
}

/** Bir masanın (Bill'in) tüm canlı bağlantılarına yayın yapılan oda adı. */
export function billRoom(billId: string): string {
  return `bill:${billId}`;
}

/** Bir restoranın personel/admin panellerine yayın yapılan oda adı (Phase 13). */
export function restaurantRoom(restaurantId: string): string {
  return `restaurant:${restaurantId}`;
}

/**
 * Socket.IO sunucusunu HTTP sunucusuna bağlar. Kimlik doğrulama, REST
 * tarafındaki requireCustomerSession/requireAuth ile AYNI güvenlik
 * mantığını izler: istemciden "ben şu bill'e aitim" diye bir bilgi asla
 * kabul edilmez — hangi odaya katılacağı SADECE cookie'deki JWT'den ve
 * veritabanından doğrulanır.
 */
export function initSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    const rawCookie = socket.request.headers.cookie;
    if (!rawCookie) {
      return next(new Error("Yetkisiz bağlantı"));
    }
    const cookies = parseCookies(rawCookie);

    // Önce müşteri cookie'sini dene.
    const customerToken = cookies[CUSTOMER_COOKIE_NAME];
    if (customerToken) {
      try {
        const payload = verifyCustomerToken(customerToken);
        const session = await prisma.customerSession.findUnique({
          where: { id: payload.customerSessionId },
          select: { billId: true, bill: { select: { status: true } } },
        });
        if (session && session.bill.status === "OPEN") {
          socket.data.customer = { customerSessionId: payload.customerSessionId, billId: session.billId };
          socket.join(billRoom(session.billId));
          return next();
        }
      } catch {
        // geçersiz token — aşağıda staff denemesine düşer
      }
    }

    // Sonra staff/admin cookie'sini dene.
    const staffToken = cookies[AUTH_COOKIE_NAME];
    if (staffToken) {
      try {
        const payload = verifyAuthToken(staffToken);
        socket.data.staff = { userId: payload.userId, restaurantId: payload.restaurantId };
        socket.join(restaurantRoom(payload.restaurantId));
        return next();
      } catch {
        // geçersiz token
      }
    }

    return next(new Error("Yetkisiz bağlantı"));
  });

  ioInstance = io;
  return io;
}

/** Controller'ların event yayınlamak için kullandığı erişim noktası. */
export function getIO(): Server {
  if (!ioInstance) {
    throw new Error("Socket.IO henüz başlatılmadı (initSocket çağrılmalı)");
  }
  return ioInstance;
}
