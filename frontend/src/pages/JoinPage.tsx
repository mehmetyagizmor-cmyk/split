import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch, ApiError } from "../lib/api";
import { LoadingScreen, ErrorScreen } from "../components/StatusScreen";

type TableInfo = {
  id: string;
  label: string;
  status: "AVAILABLE" | "OCCUPIED" | "CLOSED";
  restaurant: { name: string };
};

type CustomerMeResponse = {
  customerSession: { tableId: string };
};

export function JoinPage() {
  const { tableToken } = useParams<{ tableToken: string }>();
  const navigate = useNavigate();

  const [table, setTable] = useState<TableInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!tableToken) return;

    apiFetch<{ table: TableInfo }>(`/tables/${tableToken}`)
      .then(async ({ table: fetchedTable }) => {
        setTable(fetchedTable);

        // Bu tarayıcı zaten AYNI masaya katılmışsa (örn. sayfa yenilendi),
        // tekrar isim sormadan doğrudan lobiye geç.
        try {
          const me = await apiFetch<CustomerMeResponse>("/customer/me");
          if (me.customerSession.tableId === fetchedTable.id) {
            navigate(`/table/${tableToken}`, { replace: true });
          }
        } catch {
          // Henüz katılmamış — bu normal, isim formunu göstermeye devam ediyoruz.
        }
      })
      .catch((err: unknown) => {
        setLoadError(
          err instanceof ApiError ? err.message : "Masa bilgisi alınamadı",
        );
      });
  }, [tableToken, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tableToken || !name.trim()) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await apiFetch(`/tables/${tableToken}/join`, {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      });
      navigate(`/table/${tableToken}`);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Masaya katılırken bir hata oluştu",
      );
      setSubmitting(false);
    }
  }

  if (loadError) {
    return <ErrorScreen message={loadError} />;
  }

  if (!table) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-neutral-200">
        <p className="text-sm font-medium text-emerald-600">{table.restaurant.name}</p>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">
          Hoş geldiniz 👋
        </h1>
        <p className="mt-2 text-neutral-500">
          <span className="font-medium text-neutral-700">{table.label}</span>'ya
          katılmak için adınızı girin.
        </p>

        {table.status === "CLOSED" ? (
          <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Bu masa şu anda kapalı. Lütfen personelden yardım isteyin.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Adınız"
              autoFocus
              maxLength={40}
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-base text-neutral-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />

            {submitError && (
              <p className="text-sm text-red-600">{submitError}</p>
            )}

            <button
              type="submit"
              disabled={!name.trim() || submitting}
              className="w-full rounded-xl bg-emerald-600 py-3 text-base font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
            >
              {submitting ? "Katılıyor…" : "Masaya Katıl"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
