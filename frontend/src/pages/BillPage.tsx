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
  amountDue: string; // bahşiş hariç ödenecek tutar
  payment: {
    id: string;
    status: "PENDING" | "PAID" | "FAILED";
    tipAmount: string;
    totalAmount: string;
    paidAt: string | null;
  } | null;
};

type PaymentResult = {
  payment: { totalAmount: string; tipAmount: string };
  billClosed: boolean;
};

const TIP_PRESETS = [0, 5, 10, 15] as const;

// Kuruş bazlı tam sayı aritmetiğiyle bahşiş hesabı — JS float toplama
// hatasından kaçınmak için (aynı CartContext'teki mantık).
function calculateTip(amountDue: string, percent: number): string {
  const amountCents = Math.round(parseFloat(amountDue) * 100);
  const tipCents = Math.round((amountCents * percent) / 100);
  return (tipCents / 100).toFixed(2);
}

function addAmounts(a: string, b: string): string {
  const cents = Math.round(parseFloat(a) * 100) + Math.round(parseFloat(b) * 100);
  return (cents / 100).toFixed(2);
}

export function BillPage() {
  const { tableToken } = useParams<{ tableToken: string }>();
  const navigate = useNavigate();

  const [bill, setBill] = useState<Bill | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTipPercent, setSelectedTipPercent] = useState<number>(0);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [result, setResult] = useState<PaymentResult | null>(null);

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

  async function handlePay() {
    if (!bill) return;
    setPaying(true);
    setPayError(null);
    try {
      const tipAmount = calculateTip(bill.amountDue, selectedTipPercent);
      const res = await apiFetch<PaymentResult>("/payments", {
        method: "POST",
        body: JSON.stringify({ tipAmount }),
      });
      setResult(res);
    } catch (err) {
      setPayError(err instanceof ApiError ? err.message : "Ödeme sırasında bir hata oluştu");
    } finally {
      setPaying(false);
    }
  }

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

  // Ödeme az önce bu ekranda tamamlandıysa (veya sayfa yüklenirken zaten
  // ödenmiş olduğu görüldüyse) makbuz görünümünü göster.
  const paidTotal = result?.payment.totalAmount ?? (bill.payment?.status === "PAID" ? bill.payment.totalAmount : null);
  const paidTip = result?.payment.tipAmount ?? bill.payment?.tipAmount;

  if (paidTotal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-neutral-200">
          <p className="text-3xl">✅</p>
          <h1 className="mt-3 text-xl font-semibold text-neutral-900">Ödemeniz alındı</h1>
          <p className="mt-2 text-neutral-500">
            Bahşiş dahil toplam <span className="font-medium text-neutral-900">₺{paidTotal}</span>
            {paidTip && parseFloat(paidTip) > 0 && <> (bahşiş: ₺{paidTip})</>}
          </p>
          {result?.billClosed && (
            <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Masadaki herkes ödedi, hesap kapatıldı. Bizi tercih ettiğiniz için teşekkürler!
            </p>
          )}
          <Link
            to="/"
            className="mt-6 block w-full rounded-xl bg-emerald-600 py-3 text-center text-base font-medium text-white transition hover:bg-emerald-700"
          >
            Ana Sayfa
          </Link>
        </div>
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
        </div>

        <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Bahşiş</p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {TIP_PRESETS.map((percent) => (
              <button
                key={percent}
                onClick={() => setSelectedTipPercent(percent)}
                className={`rounded-lg py-2 text-sm font-medium transition ${
                  selectedTipPercent === percent
                    ? "bg-emerald-600 text-white"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                }`}
              >
                {percent === 0 ? "Yok" : `%${percent}`}
              </button>
            ))}
          </div>
          {selectedTipPercent > 0 && (
            <p className="mt-2 text-sm text-neutral-500">
              Bahşiş: ₺{calculateTip(bill.amountDue, selectedTipPercent)}
            </p>
          )}
        </div>

        <div className="mt-4 flex justify-between rounded-2xl bg-white p-5 text-base font-semibold text-neutral-900 shadow-sm ring-1 ring-neutral-200">
          <span>Ödenecek Toplam</span>
          <span>₺{addAmounts(bill.amountDue, calculateTip(bill.amountDue, selectedTipPercent))}</span>
        </div>

        {payError && <p className="mt-4 text-sm text-red-600">{payError}</p>}

        <button
          onClick={handlePay}
          disabled={paying}
          className="mt-6 w-full rounded-xl bg-emerald-600 py-3 text-base font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          {paying
            ? "İşleniyor…"
            : `₺${addAmounts(bill.amountDue, calculateTip(bill.amountDue, selectedTipPercent))} öde`}
        </button>
      </div>
    </div>
  );
}
