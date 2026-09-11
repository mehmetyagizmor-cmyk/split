import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch, ApiError } from "../lib/api";
import { useLiveEvents } from "../hooks/useLiveEvents";

type LobbyResponse = {
  table: { label: string; status: string };
  participants: { id: string; name: string }[];
  total: string;
};

export function TableLobbyPage() {
  const { tableToken } = useParams<{ tableToken: string }>();
  const navigate = useNavigate();

  const [lobby, setLobby] = useState<LobbyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!tableToken) return;

    // Önce bu tarayıcının gerçekten bu masaya katılmış olduğunu doğruluyoruz.
    // Katılmamışsa (cookie yok/süresi dolmuş) isim formuna geri gönderiyoruz.
    apiFetch("/customer/me")
      .then(() =>
        apiFetch<LobbyResponse>(`/tables/${tableToken}/lobby`).then(setLobby),
      )
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          navigate(`/join/${tableToken}`, { replace: true });
          return;
        }
        setError(
          err instanceof ApiError ? err.message : "Masa bilgisi alınamadı",
        );
      });
  }

  useEffect(load, [tableToken, navigate]);

  // Biri katılınca, sipariş verince ya da ödeme yapılınca liste/toplam
  // otomatik güncellensin — sayfa yenilemeye gerek kalmadan.
  useLiveEvents(["participant-joined", "order-created", "payment-made"], load);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <p className="text-center text-neutral-600">{error}</p>
      </div>
    );
  }

  if (!lobby) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <p className="text-neutral-400">Yükleniyor…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-6 py-8">
      <div className="mx-auto max-w-sm">
        <h1 className="text-2xl font-semibold text-neutral-900">
          {lobby.table.label}
        </h1>

        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <p className="text-sm font-medium text-neutral-500">Masadaki kişiler</p>
          <ul className="mt-3 space-y-2">
            {lobby.participants.map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-neutral-800">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                {p.name}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <p className="text-sm font-medium text-neutral-500">Masa Toplamı</p>
          <p className="mt-1 text-3xl font-semibold text-neutral-900">
            ₺{lobby.total}
          </p>
        </div>

        <Link
          to={`/table/${tableToken}/menu`}
          className="mt-6 block w-full rounded-xl bg-emerald-600 py-3 text-center text-base font-medium text-white transition hover:bg-emerald-700"
        >
          Menüyü Gör
        </Link>

        <Link
          to={`/table/${tableToken}/bill`}
          className="mt-3 block w-full rounded-xl bg-white py-3 text-center text-base font-medium text-neutral-900 shadow-sm ring-1 ring-neutral-200 transition hover:bg-neutral-50"
        >
          Benim Hesabım
        </Link>

        <Link
          to={`/table/${tableToken}/shared-items`}
          className="mt-3 block w-full rounded-xl bg-white py-3 text-center text-base font-medium text-neutral-900 shadow-sm ring-1 ring-neutral-200 transition hover:bg-neutral-50"
        >
          Ortak Ürünler
        </Link>
      </div>
    </div>
  );
}
