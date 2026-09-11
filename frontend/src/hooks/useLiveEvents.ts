import { useEffect } from "react";
import { socket, ensureSocketConnected } from "../lib/socket";

/**
 * Verilen Socket.IO event'lerinden herhangi biri geldiğinde `onEvent`'i
 * çalıştırır. Sayfalar bunu "olay geldi -> veriyi REST'ten tekrar çek"
 * kalıbıyla kullanıyor — sunucudan gelen kısmi veriyi elle state'e
 * birleştirmeye çalışmak yerine, her zaman tek doğruluk kaynağından
 * (REST endpoint) taze veri okumak çok daha az hataya açık.
 */
export function useLiveEvents(events: string[], onEvent: () => void) {
  useEffect(() => {
    ensureSocketConnected();
    for (const event of events) {
      socket.on(event, onEvent);
    }
    return () => {
      for (const event of events) {
        socket.off(event, onEvent);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.join(","), onEvent]);
}
