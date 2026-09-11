import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "../../lib/api";
import { useRequireAdmin } from "../../hooks/useStaffAuth";
import { StaffHeader } from "../../components/StaffHeader";

type Report = {
  range: "today" | "month";
  totalRevenue: string;
  totalTips: string;
  paymentCount: number;
  orderCount: number;
};

export function AdminDashboardPage() {
  const staff = useRequireAdmin();
  const [range, setRange] = useState<"today" | "month">("today");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!staff) return;
    apiFetch<Report>(`/admin/reports?range=${range}`)
      .then(setReport)
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Rapor alınamadı");
      });
  }, [staff, range]);

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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-neutral-900">Satış Raporu</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setRange("today")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                range === "today" ? "bg-emerald-600 text-white" : "bg-white text-neutral-600 ring-1 ring-neutral-200"
              }`}
            >
              Bugün
            </button>
            <button
              onClick={() => setRange("month")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                range === "month" ? "bg-emerald-600 text-white" : "bg-white text-neutral-600 ring-1 ring-neutral-200"
              }`}
            >
              Bu Ay
            </button>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {!report ? (
          <p className="mt-6 text-neutral-400">Yükleniyor…</p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
              <p className="text-sm text-neutral-500">Toplam Ciro</p>
              <p className="mt-1 text-2xl font-semibold text-neutral-900">₺{report.totalRevenue}</p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
              <p className="text-sm text-neutral-500">Bahşişler</p>
              <p className="mt-1 text-2xl font-semibold text-neutral-900">₺{report.totalTips}</p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
              <p className="text-sm text-neutral-500">Ödeme Sayısı</p>
              <p className="mt-1 text-2xl font-semibold text-neutral-900">{report.paymentCount}</p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
              <p className="text-sm text-neutral-500">Sipariş Sayısı</p>
              <p className="mt-1 text-2xl font-semibold text-neutral-900">{report.orderCount}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
