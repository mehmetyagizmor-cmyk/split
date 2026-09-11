import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch, ApiError } from "../lib/api";

type Bill = {
  personalItems: { id: string; name: string; quantity: number; unitPrice: string; lineTotal: string }[];
  personalSubtotal: string;
  sharedItems: { id: string; name: string; shareAmount: string }[];
  sharedSubtotal: string;
  serviceFeePercent: string;
  serviceFeeAmount: string;
  total: string;
};

export function BillPage() {
  const { tableToken } = useParams<{ tableToken: string }>();
  const navigate = useNavigate();

  const [bill, setBill] = useState<Bill | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tableToken) return;

    apiFetch<Bill>("/customer/bill")
      .then(setBill)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          navigate(`/join/${tableToken}`, { replace: true });
          return;
        }
        setError(err instanceof ApiError ? err.message : "Hesap bilgisi alınamadı");
      });
  }, [tableToken, navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <p className="text-center text-neutral-600">{error}</p>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <p className="text-neutral-400">Yükleniyor…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-6 py-8">
      <div className="mx-auto max-w-sm">
        <Link to={`/table/${tableToken}`} className="text-sm font-medium text-emerald-600">
          ← Masaya Dön
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-900">Benim Hesabım</h1>

        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Kişisel Ürünler
          </p>
          {bill.personalItems.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500">Henüz kişisel ürününüz yok.</p>
          ) : (
            <ul className="mt-3 space-y-1">
              {bill.personalItems.map((item) => (
                <li key={item.id} className="flex justify-between text-sm text-neutral-700">
                  <span>
                    {item.quantity}x {item.name}
                  </span>
                  <span>₺{item.lineTotal}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {bill.sharedItems.length > 0 && (
          <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
              Ortak Ürünlerden Payım
            </p>
            <ul className="mt-3 space-y-1">
              {bill.sharedItems.map((item) => (
                <li key={item.id} className="flex justify-between text-sm text-neutral-700">
                  <span>{item.name}</span>
                  <span>₺{item.shareAmount}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 space-y-2 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <div className="flex justify-between text-sm text-neutral-600">
            <span>Kişisel ürünler</span>
            <span>₺{bill.personalSubtotal}</span>
          </div>
          <div className="flex justify-between text-sm text-neutral-600">
            <span>Ortak ürün payı</span>
            <span>₺{bill.sharedSubtotal}</span>
          </div>
          <div className="flex justify-between text-sm text-neutral-600">
            <span>Servis ücreti (%{bill.serviceFeePercent})</span>
            <span>₺{bill.serviceFeeAmount}</span>
          </div>
          <div className="flex justify-between border-t border-neutral-100 pt-2 text-base font-semibold text-neutral-900">
            <span>Ödenecek Toplam</span>
            <span>₺{bill.total}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
