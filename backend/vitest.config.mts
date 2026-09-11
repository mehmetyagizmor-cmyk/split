import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Sıra önemli: env.ts önce TAM olarak yüklenip bitmeli ki setup.ts'in
    // import ettiği modüller process.env'i doğru okusun.
    setupFiles: ["./tests/env.ts", "./tests/setup.ts"],
    // Gerçek Neon veritabanına gidiyoruz (yerel/mock DB yok), ağ gecikmesi
    // olabileceği için varsayılan zaman aşımını biraz gevşetiyoruz.
    testTimeout: 20000,
    hookTimeout: 20000,
    // Testler aynı paylaşılan veritabanına yazıyor; dosyalar arası veri
    // çakışmasını önlemek için sıralı çalıştırıyoruz (paralel değil).
    fileParallelism: false,
  },
});
