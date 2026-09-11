import { Routes, Route } from "react-router-dom";

/**
 * Uygulamanın kök route tanımları buraya eklenecek.
 * Sonraki phase'lerde /join/:tableToken, /staff/*, /admin/* gibi
 * route'lar burada tanımlanacak.
 */
function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-neutral-900">Split 🍽️</h1>
        <p className="mt-2 text-neutral-500">
          Faz 1 kurulumu tamamlandı — frontend çalışıyor.
        </p>
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  );
}

export default App;
