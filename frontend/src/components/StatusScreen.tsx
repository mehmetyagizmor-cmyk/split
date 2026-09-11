/** Tüm sayfalarda tekrar eden "Yükleniyor…" tam ekranı — tek yerden yönetiliyor. */
export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <p className="text-neutral-400">Yükleniyor…</p>
    </div>
  );
}

/** Tüm sayfalarda tekrar eden hata mesajı ekranı. */
export function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <p className="text-center text-neutral-600">{message}</p>
    </div>
  );
}
