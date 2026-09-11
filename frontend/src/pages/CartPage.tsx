import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch, ApiError } from "../lib/api";
import { useCart } from "../context/CartContext";

export function CartPage() {
  const { tableToken } = useParams<{ tableToken: string }>();
  const navigate = useNavigate();
  const { lines, totalPrice, addItem, decreaseItem, clear } = useCart();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePlaceOrder() {
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/orders", {
        method: "POST",
        body: JSON.stringify({
          items: lines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity })),
        }),
      });
      clear();
      navigate(`/table/${tableToken}/orders`, { state: { justOrdered: true } });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Sipariş verilirken bir hata oluştu",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-6 py-8">
      <div className="mx-auto max-w-sm">
        <Link
          to={`/table/${tableToken}/menu`}
          className="text-sm font-medium text-emerald-600"
        >
          ← Menüye Dön
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-900">Sepetim</h1>

        {lines.length === 0 ? (
          <p className="mt-6 text-neutral-500">
            Sepetiniz boş. Menüden ürün ekleyebilirsiniz.
          </p>
        ) : (
          <>
            <ul className="mt-6 space-y-2">
              {lines.map((line) => (
                <li
                  key={line.menuItemId}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-900">{line.name}</p>
                    <p className="mt-0.5 text-sm text-neutral-500">₺{line.price} / adet</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      onClick={() => decreaseItem(line.menuItemId)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-lg font-medium text-neutral-700 transition hover:bg-neutral-200"
                      aria-label={`${line.name} azalt`}
                    >
                      −
                    </button>
                    <span className="w-4 text-center font-medium text-neutral-900">
                      {line.quantity}
                    </span>
                    <button
                      onClick={() => addItem(line)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-lg font-medium text-white transition hover:bg-emerald-700"
                      aria-label={`${line.name} ekle`}
                    >
                      +
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-neutral-500">Toplam</p>
                <p className="text-2xl font-semibold text-neutral-900">₺{totalPrice}</p>
              </div>
            </div>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

            <button
              onClick={handlePlaceOrder}
              disabled={submitting}
              className="mt-6 w-full rounded-xl bg-emerald-600 py-3 text-base font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
            >
              {submitting ? "Gönderiliyor…" : "Sipariş Ver"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
