import { apiClient } from './client';

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentId: string;
}

export async function createPaymentIntent(orderId: string): Promise<CreatePaymentIntentResponse> {
  const { data } = await apiClient.post<CreatePaymentIntentResponse>('/payments/stripe/intent', {
    orderId,
  });
  return data;
}
