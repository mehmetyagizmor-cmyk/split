import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "../../lib/api";
import { useRequireAdmin } from "../../hooks/useStaffAuth";
import { StaffHeader } from "../../components/StaffHeader";
import { LoadingScreen } from "../../components/StatusScreen";

type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF";
};

export function AdminStaffPage() {
  const staff = useRequireAdmin();
  const [members, setMembers] = useState<StaffMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "STAFF">("STAFF");
  const [creating, setCreating] = useState(false);

  function load() {
    apiFetch<{ staff: StaffMember[] }>("/admin/staff")
      .then((res) => setMembers(res.staff))
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Personel alınamadı"));
  }

  useEffect(() => {
    if (staff) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await apiFetch("/admin/staff", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role }),
      });
      setName("");
      setEmail("");
      setPassword("");
      setRole("STAFF");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Personel oluşturulamadı");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiFetch(`/admin/staff/${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Personel silinemedi");
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

      <div className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-neutral-900">Personel</h1>

        <form
          onSubmit={handleCreate}
          className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="İsim"
            className="col-span-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 sm:col-span-1"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "ADMIN" | "STAFF")}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="STAFF">Personel</option>
            <option value="ADMIN">Admin</option>
          </select>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-posta"
            type="email"
            className="col-span-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Şifre (en az 6 karakter)"
            type="password"
            className="col-span-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
          <button
            type="submit"
            disabled={!name || !email || password.length < 6 || creating}
            className="col-span-2 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            + Personel Ekle
          </button>
        </form>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {!members ? (
          <p className="mt-6 text-neutral-400">Yükleniyor…</p>
        ) : (
          <ul className="mt-6 space-y-2">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200"
              >
                <div>
                  <p className="font-medium text-neutral-900">{m.name}</p>
                  <p className="text-sm text-neutral-500">
                    {m.email} · {m.role === "ADMIN" ? "Admin" : "Personel"}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(m.id)}
                  className="text-sm font-medium text-neutral-500 hover:text-red-600"
                >
                  Sil
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
