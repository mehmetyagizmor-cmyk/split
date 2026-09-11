import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";

export type StaffUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF";
  restaurantId: string;
};

/**
 * Staff/admin sayfalarının ortak giriş kontrolü — müşteri tarafındaki
 * "önce /customer/me'yi kontrol et" kalıbının staff karşılığı. Giriş
 * yapılmamışsa /staff/login'e yönlendirir.
 */
export function useStaffAuth() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState<StaffUser | null>(null);

  useEffect(() => {
    apiFetch<{ user: StaffUser }>("/auth/me")
      .then((res) => setStaff(res.user))
      .catch(() => navigate("/staff/login", { replace: true }));
  }, [navigate]);

  return staff;
}

/**
 * Sadece ADMIN'e açık sayfalarda kullanılır — STAFF girişi ile buraya
 * gelinirse dashboard'a geri gönderilir. Backend zaten aynı kısıtlamayı
 * requireRole("ADMIN") ile uyguluyor, bu sadece frontend'de gereksiz bir
 * "yetkiniz yok" ekranı göstermek yerine akıcı bir yönlendirme sağlıyor.
 */
export function useRequireAdmin() {
  const staff = useStaffAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (staff && staff.role !== "ADMIN") {
      navigate("/staff/dashboard", { replace: true });
    }
  }, [staff, navigate]);

  return staff && staff.role === "ADMIN" ? staff : null;
}
