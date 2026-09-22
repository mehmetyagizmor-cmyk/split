import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, ApiError } from "../../lib/api";
import { useStaffAuth } from "../../hooks/useStaffAuth";
import { useLiveEvents } from "../../hooks/useLiveEvents";
import { StaffHeader } from "../../components/StaffHeader";
import { LoadingScreen } from "../../components/StatusScreen";

type Table = {
  id: string;
  label: string;
  status: "AVAILABLE" | "OCCUPIED" | "CLOSED";
};

const STATUS_LABELS: Record<Table["status"], string> = {
  AVAILABLE: "Boş",
  OCCUPIED: "Dolu",
  CLOSED: "Ödeme Tamamlandı",
};

const STATUS_STYLES: Record<Table["status"], string> = {
  AVAILABLE: "bg-neutral-100 text-neutral-700",
  OCCUPIED: "bg-amber-100 text-amber-800",
  CLOSED: "bg-emerald-100 text-emerald-800",
};

export function StaffDashboardPage() {
  const staff = useStaffAuth();
  const [tables, setTables] = useState<Table[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [creating, setCreating] = useState(false);

  function load() {
    apiFetch<{ tables: Table[] }>("/admin/tables")
      .then((res) => setTables(res.tables))
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Masalar alınamadı");
      });
  }

  useEffect(() => {
    if (staff) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff]);

  useLiveEvents(["order-created", "table-occupied", "table-closed"], load);

  async function handleCreateTable(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    setCreating(true);
    try {
      await apiFetch("/admin/tables", {
        method: "POST",
        body: JSON.stringify({ label: newLabel.trim() }),
      });
      setNewLabel("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Masa oluşturulamadı");
    } finally {
      setCreating(false);
    }
  }

  if (!staff) {
    return (
      <LoadingScreen />
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <StaffHeader staff={staff} />

      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-neutral-900">Masalar</h1>

        <form onSubmit={handleCreateTable} className="mt-4 flex gap-2">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Yeni masa adı (örn. Masa 6)"
            className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
          <button
            type="submit"
            disabled={!newLabel.trim() || creating}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            + Masa Ekle
          </button>
        </form>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {!tables ? (
          <p className="mt-6 text-neutral-400">Yükleniyor…</p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {tables.map((table) => (
              <Link
                key={table.id}
                to={`/staff/tables/${table.id}`}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200 transition hover:ring-emerald-300"
              >
                <p className="font-medium text-neutral-900">{table.label}</p>
                <span
                  className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[table.status]}`}
                >
                  {STATUS_LABELS[table.status]}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
