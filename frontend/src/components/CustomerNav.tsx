import { Link } from "react-router-dom";

type NavKey = "lobby" | "menu" | "orders" | "bill";

const ITEMS: { key: NavKey; label: string; path: string }[] = [
  { key: "lobby", label: "Masa", path: "" },
  { key: "menu", label: "Menü", path: "/menu" },
  { key: "orders", label: "Siparişlerim", path: "/orders" },
  { key: "bill", label: "Hesabım", path: "/bill" },
];

/**
 * Müşteri sayfalarının tümünde sabit kalan alt navigasyon — spesifikasyonun
 * istediği "sabit Hesabım butonu"nu karşılıyor, ayrıca Menü/Siparişlerim/Masa
 * arasında Lobi'ye dönmeden geçiş yapılabilmesini sağlıyor. Sayfa içeriğinin
 * bu çubuğun altında kalmaması için kullanıldığı sayfalarda alt padding
 * (pb-24) eklenmesi gerekiyor.
 */
export function CustomerNav({ tableToken, active }: { tableToken: string; active?: NavKey }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)]">
      {ITEMS.map((item) => (
        <Link
          key={item.key}
          to={`/table/${tableToken}${item.path}`}
          className={`flex-1 py-3 text-center text-sm font-medium transition ${
            active === item.key ? "text-emerald-600" : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
