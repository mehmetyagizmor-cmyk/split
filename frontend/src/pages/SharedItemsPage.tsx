import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch, ApiError } from "../lib/api";

type Participant = { id: string; name: string };

type BillOrderItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  isShared: boolean;
  sharedWith: { customerSessionId: string; name: string; shareAmount: string }[];
};

type BillOrder = {
  id: string;
  status: string;
  orderedBy: Participant;
  items: BillOrderItem[];
};

function ShareEditor({
  item,
  participants,
  onSaved,
}: {
  item: BillOrderItem;
  participants: Participant[];
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(item.sharedWith.map((p) => p.customerSessionId)),
  );
  const [saving, setSaving] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await apiFetch(`/orders/items/${item.id}/share`, {
        method: "POST",
        body: JSON.stringify({ customerSessionIds: [...selected] }),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl bg-neutral-50 p-3">
      <p className="text-sm font-medium text-neutral-700">Kimler paylaşacak?</p>
      <ul className="mt-2 space-y-1.5">
        {participants.map((p) => (
          <li key={p.id}>
            <label className="flex items-center gap-2 text-sm text-neutral-800">
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => toggle(p.id)}
                className="h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
              />
              {p.name}
            </label>
          </li>
        ))}
      </ul>
      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-3 w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
      >
        {saving ? "Kaydediliyor…" : "Kaydet"}
      </button>
    </div>
  );
}

export function SharedItemsPage() {
  const { tableToken } = useParams<{ tableToken: string }>();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<BillOrder[] | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  function load() {
    if (!tableToken) return;
    Promise.all([
      apiFetch<{ orders: BillOrder[] }>("/orders/bill"),
      apiFetch<{ participants: Participant[] }>(`/tables/${tableToken}/lobby`),
    ])
      .then(([ordersRes, lobbyRes]) => {
        setOrders(ordersRes.orders);
        setParticipants(lobbyRes.participants);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          navigate(`/join/${tableToken}`, { replace: true });
          return;
        }
        setError(err instanceof ApiError ? err.message : "Siparişler alınamadı");
      });
  }

  useEffect(load, [tableToken, navigate]);

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

  const allItems = orders.flatMap((order) =>
    order.items.map((item) => ({ item, orderedBy: order.orderedBy })),
  );

  return (
    <div className="min-h-screen bg-neutral-50 px-6 py-8">
      <div className="mx-auto max-w-sm">
        <Link to={`/table/${tableToken}`} className="text-sm font-medium text-emerald-600">
          ← Masaya Dön
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-900">Ortak Ürünler</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Masaya gelen bir ürünü kimlerin paylaşacağını burada işaretleyebilirsin.
        </p>

        {allItems.length === 0 ? (
          <p className="mt-6 text-neutral-500">Masada henüz sipariş yok.</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {allItems.map(({ item, orderedBy }) => (
              <li
                key={item.id}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-neutral-900">
                      {item.quantity}x {item.name}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {orderedBy.name} sipariş etti · ₺{item.lineTotal}
                    </p>
                  </div>
                  {!item.isShared && (
                    <button
                      onClick={() => setEditingItemId(item.id)}
                      className="shrink-0 rounded-lg bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-200"
                    >
                      Paylaştır
                    </button>
                  )}
                </div>

                {item.isShared && editingItemId !== item.id && (
                  <div className="mt-3 rounded-xl bg-emerald-50 p-3">
                    <p className="text-sm font-medium text-emerald-800">
                      Paylaşılıyor: {item.sharedWith.map((p) => p.name).join(", ")}
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {item.sharedWith.map((p) => (
                        <li key={p.customerSessionId} className="text-sm text-emerald-700">
                          {p.name}: ₺{p.shareAmount}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => setEditingItemId(item.id)}
                      className="mt-2 text-sm font-medium text-emerald-700 underline"
                    >
                      Düzenle
                    </button>
                  </div>
                )}

                {editingItemId === item.id && (
                  <ShareEditor
                    item={item}
                    participants={participants}
                    onSaved={() => {
                      setEditingItemId(null);
                      load();
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
