export interface IPaymentProvider {
  refund(paymentKey: string, amount: number, reason?: string): Promise<void>;
}
