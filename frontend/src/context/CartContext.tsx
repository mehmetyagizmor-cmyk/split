import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type CartLine = {
  menuItemId: string;
  name: string;
  price: string; // backend'den "180.00" gibi string olarak geliyor
  quantity: number;
};

type CartContextValue = {
  lines: CartLine[];
  totalCount: number;
  totalPrice: string;
  getQuantity: (menuItemId: string) => number;
  addItem: (item: Omit<CartLine, "quantity">) => void;
  decreaseItem: (menuItemId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

// Sepeti sessionStorage'da tutuyoruz ki biri menüdeyken yanlışlıkla sayfayı
// yenilerse (F5) seçtiği ürünler kaybolmasın. sessionStorage bilerek seçildi
// (localStorage değil) — sekme kapanınca sıfırlanması, bir önceki müşterinin
// sepetinin aynı cihazda sonraki bir ziyarete sızmaması için daha güvenli.
const STORAGE_KEY = "split_cart";

function loadInitialLines(): CartLine[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(loadInitialLines);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // sessionStorage kullanılamıyorsa (örn. gizli sekme kısıtlaması) sessizce
      // devam ediyoruz — sepet o oturumda sadece bellekte yaşamaya devam eder.
    }
  }, [lines]);

  function addItem(item: Omit<CartLine, "quantity">) {
    setLines((prev) => {
      const existing = prev.find((l) => l.menuItemId === item.menuItemId);
      if (existing) {
        return prev.map((l) =>
          l.menuItemId === item.menuItemId
            ? { ...l, quantity: l.quantity + 1 }
            : l,
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }

  function decreaseItem(menuItemId: string) {
    setLines((prev) =>
      prev
        .map((l) =>
          l.menuItemId === menuItemId ? { ...l, quantity: l.quantity - 1 } : l,
        )
        .filter((l) => l.quantity > 0),
    );
  }

  function clear() {
    setLines([]);
  }

  function getQuantity(menuItemId: string) {
    return lines.find((l) => l.menuItemId === menuItemId)?.quantity ?? 0;
  }

  const totalCount = lines.reduce((sum, l) => sum + l.quantity, 0);

  // Kuruş bazlı tam sayı toplamı — ekranda anlık gösterim için bile JS float
  // toplama hatasından (0.1 + 0.2 gibi) kaçınmak için fiyatları kuruşa çevirip
  // topluyoruz, sonra tekrar TL'ye dönüyoruz. Asıl otoriter toplam backend'de
  // Decimal ile hesaplanıyor, bu sadece kullanıcıya anlık geri bildirim.
  const totalPrice = useMemo(() => {
    const totalCents = lines.reduce(
      (sum, l) => sum + Math.round(parseFloat(l.price) * 100) * l.quantity,
      0,
    );
    return (totalCents / 100).toFixed(2);
  }, [lines]);

  return (
    <CartContext.Provider
      value={{ lines, totalCount, totalPrice, getQuantity, addItem, decreaseItem, clear }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart, <CartProvider> içinde kullanılmalı");
  }
  return ctx;
}
