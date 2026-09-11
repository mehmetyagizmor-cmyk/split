import { createServer } from "http";
import { app } from "./app";
import { initSocket } from "./lib/socket";

const PORT = process.env.PORT ?? 4000;

// Socket.IO, Express'in kendi HTTP sunucusuna "binmesi" gerektiği için
// app.listen yerine http.createServer(app) kullanıyoruz.
const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`✅ Backend çalışıyor: http://localhost:${PORT}`);
});
