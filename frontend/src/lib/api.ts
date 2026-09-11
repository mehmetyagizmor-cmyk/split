const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

/**
 * Backend'e istek atan tek merkezi fonksiyon. `credentials: "include"` her
 * istekte zorunlu — httpOnly cookie'lerimiz (customer_token/token) ancak
 * bununla gönderilip alınıyor, unutulursa auth sessizce çalışmaz.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? "Bir hata oluştu");
  }

  return data as T;
}
