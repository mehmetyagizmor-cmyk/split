import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, ApiError } from "../../lib/api";

export function StaffLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Zaten giriş yapılmışsa tekrar form göstermeye gerek yok.
  useEffect(() => {
    apiFetch("/auth/me")
      .then(() => navigate("/staff/dashboard", { replace: true }))
      .catch(() => {
        // giriş yapılmamış — form kalsın
      });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      navigate("/staff/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Giriş yapılamadı");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-neutral-200">
        <h1 className="text-2xl font-semibold text-neutral-900">Personel Girişi</h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-posta"
            autoFocus
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-base text-neutral-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Şifre"
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-base text-neutral-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={!email || !password || submitting}
            className="w-full rounded-xl bg-emerald-600 py-3 text-base font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {submitting ? "Giriş yapılıyor…" : "Giriş Yap"}
          </button>
        </form>
      </div>
    </div>
  );
}
