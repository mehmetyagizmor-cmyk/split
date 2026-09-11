import { Prisma } from "@prisma/client";

/**
 * Bir satır listesinin (quantity * unitPrice toplamı) parasal toplamını
 * Decimal.js üzerinden hesaplar. JS'in normal `+`/`*` operatörleriyle para
 * toplamak yuvarlama hatası üretebileceği için bu proje boyunca her yerde
 * bu yardımcıyı kullanıyoruz (lobby toplamı, sipariş toplamı, ileride hesap).
 */
export function sumLineItems(
  items: { unitPrice: Prisma.Decimal; quantity: number }[],
): Prisma.Decimal {
  let total = new Prisma.Decimal(0);
  for (const item of items) {
    total = total.plus(item.unitPrice.times(item.quantity));
  }
  return total;
}
