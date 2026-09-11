import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ??
  "http://localhost:4000";

/**
 * Uygulama boyunca tek bir socket bağlantısı. `withCredentials: true` —
 * customer_token/token cookie'lerimiz bağlantı sırasında (handshake'te)
 * gönderilsin diye, backend'deki initSocket bu cookie'lere göre hangi
 * "oda"ya (bill/restaurant) katılacağını belirliyor.
 *
 * `autoConnect: false` — sadece bir müşteri sayfası gerçekten ihtiyaç
 * duyduğunda (yani zaten katılmış olduğu doğrulandıktan sonra) bağlanıyoruz;
 * cookie yokken (örn. Join sayfasında) bağlanmaya çalışıp anlamsız yere
 * "yetkisiz bağlantı" hatası almayalım diye.
 */
export const socket = io(SOCKET_URL, {
  withCredentials: true,
  autoConnect: false,
});

export function ensureSocketConnected() {
  if (!socket.connected) {
    socket.connect();
  }
}
