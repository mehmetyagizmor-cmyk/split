export type ChargeResult = { success: true } | { success: false; reason: string };

/**
 * Gerçek bir ödeme sağlayıcısına (iyzico, Stripe vb.) bağlanmadan önce
 * kullandığımız soyutlama. İleride gerçek entegrasyon eklemek için tek
 * yapılması gereken: bu arayüzü uygulayan yeni bir sınıf yazıp aşağıdaki
 * `paymentProvider` export'unu onunla değiştirmek — controller kodu HİÇ
 * değişmeyecek.
 */
export interface PaymentProvider {
  charge(amountTotal: string): Promise<ChargeResult>;
}

/** MVP'de gerçek para hareketi yok — her çağrı başarılı kabul edilir. */
class MockPaymentProvider implements PaymentProvider {
  async charge(_amountTotal: string): Promise<ChargeResult> {
    return { success: true };
  }
}

export const paymentProvider: PaymentProvider = new MockPaymentProvider();
