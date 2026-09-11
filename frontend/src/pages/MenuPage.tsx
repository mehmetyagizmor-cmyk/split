import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch, ApiError } from "../lib/api";

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: string;
};

type MenuCategory = {
  id: string;
  name: string;
  menuItems: MenuItem[];
};

export function MenuPage() {
  const { tableToken } = useParams<{ tableToken: string }>();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<MenuCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tableToken) return;

    // Menüye bakabilmek için önce bu masaya katılmış olmak gerekiyor —
    // Lobi sayfasıyla aynı kontrol.
    apiFetch("/customer/me")
      .then(() =>
        apiFetch<{ categories: MenuCategory[] }>(
          `/tables/${tableToken}/menu`,
        ).then((data) => setCategories(data.categories)),
      )
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          navigate(`/join/${tableToken}`, { replace: true });
          return;
        }
        setError(
          err instanceof ApiError ? err.message : "Menü yüklenemedi",
        );
      });
  }, [tableToken, navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <p className="text-center text-neutral-600">{error}</p>
      </div>
    );
  }

  if (!categories) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <p className="text-neutral-400">Yükleniyor…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-6 py-8">
      <div className="mx-auto max-w-sm">
        <Link
          to={`/table/${tableToken}`}
          className="text-sm font-medium text-emerald-600"
        >
          ← Masaya Dön
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-900">Menü</h1>

        <div className="mt-6 space-y-8">
          {categories.map((category) => (
            <section key={category.id}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
                {category.name}
              </h2>
              <ul className="mt-3 space-y-2">
                {category.menuItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200"
                  >
                    <div>
                      <p className="font-medium text-neutral-900">{item.name}</p>
                      {item.description && (
                        <p className="mt-0.5 text-sm text-neutral-500">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <p className="ml-4 shrink-0 font-medium text-neutral-900">
                      ₺{item.price}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
