import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import type { StaffUser } from "../hooks/useStaffAuth";

export function StaffHeader({ staff }: { staff: StaffUser }) {
  const navigate = useNavigate();

  async function handleLogout() {
    await apiFetch("/auth/logout", { method: "POST" });
    navigate("/staff/login", { replace: true });
  }

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-neutral-900">Split — Personel</span>
          <nav className="flex gap-4 text-sm font-medium text-neutral-600">
            <Link to="/staff/dashboard" className="hover:text-emerald-600">
              Masalar
            </Link>
            <Link to="/staff/orders" className="hover:text-emerald-600">
              Siparişler
            </Link>
            {staff.role === "ADMIN" && (
              <>
                <Link to="/admin/dashboard" className="hover:text-emerald-600">
                  Rapor
                </Link>
                <Link to="/admin/menu" className="hover:text-emerald-600">
                  Menü
                </Link>
                <Link to="/admin/staff" className="hover:text-emerald-600">
                  Personel
                </Link>
                <Link to="/admin/settings" className="hover:text-emerald-600">
                  Ayarlar
                </Link>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-neutral-500">
            {staff.name} <span className="text-neutral-400">({staff.role})</span>
          </span>
          <button onClick={handleLogout} className="font-medium text-neutral-600 hover:text-red-600">
            Çıkış
          </button>
        </div>
      </div>
    </header>
  );
}
