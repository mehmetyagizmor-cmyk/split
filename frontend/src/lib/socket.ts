import { io } from "socket.io-client";

// VITE_API_URL production'da "/api" (göreli, aynı origin) olabilir — bu
// durumda "/api" ekini silince geriye boş string kalır, ki bu da socket.io'ya
// "şu an sayfanın açık olduğu origin'e bağlan" demenin doğru yolu değil;
// bunun için argümanı hiç vermemek (undefined) gerekiyor.
const rawUrl = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "");
const SOCKET_URL = rawUrl && rawUrl.length > 0 ? rawUrl : undefined;

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
