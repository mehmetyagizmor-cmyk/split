import { createServer } from "http";
import { initSocket } from "../src/lib/socket";

// Controller'lar getIO().to(...).emit(...) çağırıyor — gerçek bir socket
// bağlantısı kurmasak da (bu testler REST seviyesinde), initSocket
// çağrılmadan getIO() hata fırlatır. Dinlemeyen (listen edilmemiş) bir
// HTTP sunucusuna bağlamak yeterli, kimse bağlanmayacağı için emit'ler
// sessizce hiçbir şey yapmaz.
initSocket(createServer());
