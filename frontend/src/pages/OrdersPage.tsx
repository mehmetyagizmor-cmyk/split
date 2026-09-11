import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { apiFetch, ApiError } from "../lib/api";

type Order = {
  id: string;
  status: "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";
  createdAt: string;
  items: {
    id: string;
    name: string;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
  }[];
  total: string;
};

const STATUS_LABELS: Record<Order["status"], string> = {
  PENDING: "Beklemede",
  CONFIRMED: "Onaylandı",
  PREPARING: "Hazırlanıyor",
  READY: "Hazır",
  SERVED: "Servis Edildi",
  CANCELLED: "İptal Edildi",
};

const STATUS_STYLES: Record<Order["status"], string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PREPARING: "bg-blue-100 text-blue-800",
  READY: "bg-emerald-100 text-emerald-800",
  SERVED: "bg-neutral-100 text-neutral-700",
  CANCELLED: "bg-red-100 text-red-800",
};

export function OrdersPage() {
  const { tableToken } = useParams<{ tableToken: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const justOrdered = Boolean((location.state as { justOrdered?: boolean } | null)?.justOrdered);

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tableToken) return;

    apiFetch("/customer/me")
      .then(() => apiFetch<{ orders: Order[] }>("/orders/my").then((data) => setOrders(data.orders)))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          navigate(`/join/${tableToken}`, { replace: true });
          return;
        }
        setError(err instanceof ApiError ? err.message : "Siparişler alınamadı");
      });
  }, [tableToken, navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <p className="text-center text-neutral-600">{error}</p>
      </div>
    );
  }

  if (!orders) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <p className="text-neutral-400">Yükleniyor…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-6 py-8">
      <div className="mx-auto max-w-sm">
        <Link
          to={`/table/${tableToken}`}
          className="text-sm font-medium text-emerald-600"
        >
          ← Masaya Dön
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-900">Siparişlerim</h1>

        {justOrdered && (
          <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            ✅ Siparişiniz alındı.
          </p>
        )}

        {orders.length === 0 ? (
          <p className="mt-6 text-neutral-500">Henüz siparişiniz yok.</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {orders.map((order) => (
              <li
                key={order.id}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[order.status]}`}
                  >
                    {STATUS_LABELS[order.status]}
                  </span>
                  <span className="text-sm text-neutral-400">
                    {new Date(order.createdAt).toLocaleTimeString("tr-TR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <ul className="mt-3 space-y-1">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex justify-between text-sm text-neutral-700">
                      <span>
                        {item.quantity}x {item.name}
                      </span>
                      <span>₺{item.lineTotal}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex justify-between border-t border-neutral-100 pt-3 text-sm font-medium text-neutral-900">
                  <span>Toplam</span>
                  <span>₺{order.total}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
