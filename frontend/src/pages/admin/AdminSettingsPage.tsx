import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "../../lib/api";
import { useRequireAdmin } from "../../hooks/useStaffAuth";
import { StaffHeader } from "../../components/StaffHeader";

type Settings = { name: string; serviceFeePercent: string };

export function AdminSettingsPage() {
  const staff = useRequireAdmin();
  const [name, setName] = useState("");
  const [serviceFeePercent, setServiceFeePercent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!staff) return;
    apiFetch<{ restaurant: Settings }>("/admin/settings")
      .then((res) => {
        setName(res.restaurant.name);
        setServiceFeePercent(res.restaurant.serviceFeePercent);
        setLoaded(true);
      })
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Ayarlar alınamadı"));
  }, [staff]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await apiFetch("/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ name, serviceFeePercent }),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  if (!staff || !loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <p className="text-neutral-400">Yükleniyor…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <StaffHeader staff={staff} />

      <div className="mx-auto max-w-md px-6 py-8">
        <h1 className="text-2xl font-semibold text-neutral-900">Restoran Ayarları</h1>

        <form
          onSubmit={handleSave}
          className="mt-4 space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200"
        >
          <div>
            <label className="text-sm font-medium text-neutral-700">Restoran Adı</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700">Servis Ücreti (%)</label>
            <input
              value={serviceFeePercent}
              onChange={(e) => setServiceFeePercent(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-neutral-400">
              Müşterilerin hesabına eklenen servis ücreti yüzdesi (örn. 10.00).
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {saved && <p className="text-sm text-emerald-600">Kaydedildi.</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </form>
      </div>
    </div>
  );
}
