import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "../../lib/api";
import { useStaffAuth } from "../../hooks/useStaffAuth";
import { useLiveEvents } from "../../hooks/useLiveEvents";
import { StaffHeader } from "../../components/StaffHeader";

type OrderStatus = "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";

type AdminOrder = {
  id: string;
  status: OrderStatus;
  createdAt: string;
  table: { id: string; label: string };
  customerName: string;
  items: { id: string; name: string; quantity: number; lineTotal: string }[];
  total: string;
};

const STATUS_OPTIONS: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "SERVED",
  "CANCELLED",
];

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Beklemede",
  CONFIRMED: "Onaylandı",
  PREPARING: "Hazırlanıyor",
  READY: "Hazır",
  SERVED: "Servis Edildi",
  CANCELLED: "İptal Edildi",
};

export function StaffOrdersPage() {
  const staff = useStaffAuth();
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    apiFetch<{ orders: AdminOrder[] }>("/admin/orders")
      .then((res) => setOrders(res.orders))
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Siparişler alınamadı");
      });
  }

  useEffect(() => {
    if (staff) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff]);

  useLiveEvents(["order-created", "order-status-changed"], load);

  async function handleStatusChange(orderId: string, status: OrderStatus) {
    try {
      await apiFetch(`/admin/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Durum güncellenemedi");
    }
  }

  if (!staff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <p className="text-neutral-400">Yükleniyor…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <StaffHeader staff={staff} />

      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-neutral-900">Aktif Siparişler</h1>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {!orders ? (
          <p className="mt-6 text-neutral-400">Yükleniyor…</p>
        ) : orders.length === 0 ? (
          <p className="mt-6 text-neutral-500">Şu anda bekleyen sipariş yok.</p>
        ) : (
          <div className="mt-6 space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-neutral-900">
                      {order.table.label} — {order.customerName}
                    </p>
                    <p className="text-sm text-neutral-400">
                      {new Date(order.createdAt).toLocaleTimeString("tr-TR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                    className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </div>

                <ul className="mt-3 space-y-1 border-t border-neutral-100 pt-3">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex justify-between text-sm text-neutral-700">
                      <span>
                        {item.quantity}x {item.name}
                      </span>
                      <span>₺{item.lineTotal}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
