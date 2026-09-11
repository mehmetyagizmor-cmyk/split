/**
 * Beklenen (bilinçli fırlatılan) hatalar için ortak sınıf.
 * Controller'larda `throw new ApiError(404, "Masa bulunamadı")` şeklinde
 * kullanılır, merkezi error handler bunu doğru HTTP status koduyla JSON'a çevirir.
 */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}
