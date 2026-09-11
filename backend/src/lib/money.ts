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

/**
 * Bir tutarı N kişi arasında KURUŞU KURUŞUNA eksiksiz böler — ₺200 / 3 gibi
 * bölünmeyen tutarlarda "kayıp kuruş" olmaması için tamamı kuruş (integer)
 * üzerinden hesaplanır, kalan kuruşlar sırayla ilk katılımcılara dağıtılır.
 * Örnek: 200.00 / 3 -> [66.67, 66.67, 66.66] (toplamı tam 200.00).
 */
export function splitEvenly(total: Prisma.Decimal, parts: number): Prisma.Decimal[] {
  if (parts <= 0) return [];

  const totalCents = total.times(100).toDecimalPlaces(0).toNumber();
  const baseCents = Math.floor(totalCents / parts);
  const remainderCents = totalCents - baseCents * parts;

  const shares: Prisma.Decimal[] = [];
  for (let i = 0; i < parts; i++) {
    const cents = baseCents + (i < remainderCents ? 1 : 0);
    shares.push(new Prisma.Decimal(cents).dividedBy(100));
  }
  return shares;
}
