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

export interface NaverPayPrepareResponse {
  paymentId: string;
  merchantPayKey: string;
  paymentURL: string;
}

export async function naverPayPrepare(orderId: string): Promise<NaverPayPrepareResponse> {
  const { data } = await apiClient.post<NaverPayPrepareResponse>('/payments/naver/prepare', {
    orderId,
  });
  return data;
}

export interface NaverPayApproveResponse {
  orderId: string;
  status: string;
}

export async function naverPayApprove(
  paymentId: string,
  merchantPayKey: string,
): Promise<NaverPayApproveResponse> {
  const { data } = await apiClient.post<NaverPayApproveResponse>('/payments/naver/approve', {
    paymentId,
    merchantPayKey,
  });
  return data;
}
