import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "../../lib/api";
import { useRequireAdmin } from "../../hooks/useStaffAuth";
import { StaffHeader } from "../../components/StaffHeader";

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  isAvailable: boolean;
};

type MenuCategory = {
  id: string;
  name: string;
  sortOrder: number;
  menuItems: MenuItem[];
};

function NewItemForm({ categoryId, onCreated }: { categoryId: string; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/admin/menu/items", {
        method: "POST",
        body: JSON.stringify({ categoryId, name, price, isAvailable: true }),
      });
      setName("");
      setPrice("");
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ürün eklenemedi");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Yeni ürün adı"
        className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
      />
      <input
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="Fiyat"
        className="w-24 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={!name || !price || submitting}
        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
      >
        Ekle
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

export function AdminMenuPage() {
  const staff = useRequireAdmin();
  const [categories, setCategories] = useState<MenuCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");

  function load() {
    apiFetch<{ categories: MenuCategory[] }>("/admin/menu/full")
      .then((res) => setCategories(res.categories))
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Menü alınamadı"));
  }

  useEffect(() => {
    if (staff) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff]);

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await apiFetch("/admin/menu/categories", {
        method: "POST",
        body: JSON.stringify({ name: newCategoryName.trim(), sortOrder: categories?.length ?? 0 }),
      });
      setNewCategoryName("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kategori oluşturulamadı");
    }
  }

  async function handleDeleteCategory(id: string) {
    try {
      await apiFetch(`/admin/menu/categories/${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kategori silinemedi");
    }
  }

  async function handleToggleAvailable(item: MenuItem) {
    try {
      await apiFetch(`/admin/menu/items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isAvailable: !item.isAvailable }),
      });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Güncellenemedi");
    }
  }

  async function handlePriceChange(item: MenuItem, price: string) {
    if (!/^\d+(\.\d{1,2})?$/.test(price)) return;
    try {
      await apiFetch(`/admin/menu/items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ price }),
      });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Fiyat güncellenemedi");
    }
  }

  async function handleDeleteItem(id: string) {
    try {
      await apiFetch(`/admin/menu/items/${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ürün silinemedi");
    }
  }

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

      <div className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-neutral-900">Menü Yönetimi</h1>

        <form onSubmit={handleCreateCategory} className="mt-4 flex gap-2">
          <input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Yeni kategori adı"
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={!newCategoryName.trim()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            + Kategori
          </button>
        </form>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {!categories ? (
          <p className="mt-6 text-neutral-400">Yükleniyor…</p>
        ) : (
          <div className="mt-6 space-y-6">
            {categories.map((category) => (
              <section
                key={category.id}
                className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-neutral-900">{category.name}</h2>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="text-sm font-medium text-neutral-400 hover:text-red-600"
                  >
                    Kategoriyi Sil
                  </button>
                </div>

                <ul className="mt-3 space-y-2">
                  {category.menuItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 rounded-xl bg-neutral-50 p-3"
                    >
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.isAvailable}
                          onChange={() => handleToggleAvailable(item)}
                          className="h-4 w-4 rounded border-neutral-300 text-emerald-600"
                        />
                      </label>
                      <span
                        className={`flex-1 text-sm ${item.isAvailable ? "text-neutral-900" : "text-neutral-400 line-through"}`}
                      >
                        {item.name}
                      </span>
                      <span className="text-sm text-neutral-500">₺</span>
                      <input
                        defaultValue={item.price}
                        onBlur={(e) => handlePriceChange(item, e.target.value)}
                        className="w-20 rounded-lg border border-neutral-300 px-2 py-1 text-sm"
                      />
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-sm font-medium text-neutral-400 hover:text-red-600"
                      >
                        Sil
                      </button>
                    </li>
                  ))}
                </ul>

                <NewItemForm categoryId={category.id} onCreated={load} />
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
