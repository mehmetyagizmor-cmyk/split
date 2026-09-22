import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch, ApiError } from "../../lib/api";
import { useStaffAuth } from "../../hooks/useStaffAuth";
import { useLiveEvents } from "../../hooks/useLiveEvents";
import { StaffHeader } from "../../components/StaffHeader";
import { LoadingScreen } from "../../components/StatusScreen";

type OrderStatus = "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";

type TableDetail = {
  table: { id: string; label: string; token: string; status: string };
  bill: {
    id: string;
    participants: { id: string; name: string; paymentStatus: "PAID" | "UNPAID"; paidAmount: string | null }[];
    orders: {
      id: string;
      status: OrderStatus;
      createdAt: string;
      customerName: string;
      items: { id: string; name: string; quantity: number; lineTotal: string }[];
    }[];
    grandTotal: string;
  } | null;
};

type MenuCategory = {
  id: string;
  name: string;
  menuItems: { id: string; name: string; price: string }[];
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

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

export function StaffTableDetailPage() {
  const { id } = useParams<{ id: string }>();
  const staff = useStaffAuth();

  const [detail, setDetail] = useState<TableDetail | null>(null);
  const [menu, setMenu] = useState<MenuCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedMenuItemId, setSelectedMenuItemId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [addingOrder, setAddingOrder] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  function load() {
    if (!id) return;
    apiFetch<TableDetail>(`/admin/tables/${id}`)
      .then(setDetail)
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Masa bilgisi alınamadı");
      });
  }

  useEffect(() => {
    if (staff) {
      load();
      apiFetch<{ categories: MenuCategory[] }>("/admin/menu").then((res) => setMenu(res.categories));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff, id]);

  useLiveEvents(
    ["order-created", "order-status-changed", "participant-joined", "payment-made"],
    load,
  );

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

  async function handleAddOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !selectedCustomerId || !selectedMenuItemId) return;
    setAddingOrder(true);
    try {
      await apiFetch(`/admin/tables/${id}/orders`, {
        method: "POST",
        body: JSON.stringify({
          customerSessionId: selectedCustomerId,
          items: [{ menuItemId: selectedMenuItemId, quantity }],
        }),
      });
      setSelectedMenuItemId("");
      setQuantity(1);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sipariş eklenemedi");
    } finally {
      setAddingOrder(false);
    }
  }

  async function handleRegenerateToken() {
    if (!id) return;
    setRegenerating(true);
    try {
      await apiFetch(`/admin/tables/${id}/regenerate-token`, { method: "POST" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Token yenilenemedi");
    } finally {
      setRegenerating(false);
    }
  }

  if (!staff || !detail) {
    return (
      <LoadingScreen />
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <StaffHeader staff={staff} />

      <div className="mx-auto max-w-4xl px-6 py-8">
        <Link to="/staff/dashboard" className="text-sm font-medium text-emerald-600">
          ← Masalar
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-900">{detail.table.label}</h1>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {/* QR kod */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Masa QR Kodu
            </p>
            <img
              src={`${API_URL}/admin/tables/${detail.table.id}/qrcode`}
              alt="Masa QR kodu"
              className="mt-3 h-40 w-40"
            />
            {staff.role === "ADMIN" && (
              <button
                onClick={handleRegenerateToken}
                disabled={regenerating}
                className="mt-3 rounded-lg bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-200"
              >
                {regenerating ? "Yenileniyor…" : "Token'ı Yenile"}
              </button>
            )}
          </div>

          {/* Katılımcılar */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Katılımcılar
            </p>
            {!detail.bill ? (
              <p className="mt-3 text-sm text-neutral-500">Masada kimse yok.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {detail.bill.participants.map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-neutral-800">{p.name}</span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        p.paymentStatus === "PAID"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {p.paymentStatus === "PAID" ? `Ödedi (₺${p.paidAmount})` : "Ödemedi"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {detail.bill && (
              <p className="mt-4 border-t border-neutral-100 pt-3 text-sm font-semibold text-neutral-900">
                Masa Toplamı: ₺{detail.bill.grandTotal}
              </p>
            )}
          </div>
        </div>

        {detail.bill && (
          <>
            {/* Sipariş ekle */}
            <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
              <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Sipariş Ekle
              </p>
              <form onSubmit={handleAddOrder} className="mt-3 flex flex-wrap items-end gap-2">
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">Kişi seç…</option>
                  {detail.bill.participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedMenuItemId}
                  onChange={(e) => setSelectedMenuItemId(e.target.value)}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">Ürün seç…</option>
                  {menu?.map((category) => (
                    <optgroup key={category.id} label={category.name}>
                      {category.menuItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} — ₺{item.price}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-20 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
                <button
                  type="submit"
                  disabled={!selectedCustomerId || !selectedMenuItemId || addingOrder}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
                >
                  Ekle
                </button>
              </form>
            </div>

            {/* Siparişler */}
            <div className="mt-6 space-y-3">
              {detail.bill.orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-neutral-900">{order.customerName}</p>
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                      className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
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
          </>
        )}
      </div>
    </div>
  );
}
