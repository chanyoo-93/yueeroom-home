import { apiClient } from './client';
import type { PaginatedPaymentsResponse, Refund } from '../types/order';

export async function getPayments(page = 1, limit = 10): Promise<PaginatedPaymentsResponse> {
  const res = await apiClient.get<PaginatedPaymentsResponse>('/payments/me', {
    params: { page, limit },
  });
  return res.data;
}

export async function requestRefund(paymentId: string, reason: string): Promise<Refund> {
  const res = await apiClient.post<Refund>(`/payments/${paymentId}/refund`, { reason });
  return res.data;
}

export interface KcpCardPrepareResponse {
  siteCode: string;
  orderId: string;
  amount: number;
  productName: string;
  timestamp: string;
  signData: string;
}

export async function kcpCardPrepare(orderId: string): Promise<KcpCardPrepareResponse> {
  const { data } = await apiClient.post<KcpCardPrepareResponse>('/payments/kcp/card/prepare', {
    orderId,
  });
  return data;
}

export interface KcpVbankPrepareResponse {
  accountNumber: string;
  bankName: string;
  expiresAt: string;
  amount: number;
}

export async function kcpVbankPrepare(orderId: string): Promise<KcpVbankPrepareResponse> {
  const { data } = await apiClient.post<KcpVbankPrepareResponse>('/payments/kcp/vbank/prepare', {
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

export interface KakaoPayReadyResponse {
  tid: string;
  redirectUrl: string;
}

export async function kakaoPayReady(orderId: string): Promise<KakaoPayReadyResponse> {
  const { data } = await apiClient.post<KakaoPayReadyResponse>('/payments/kakao/ready', {
    orderId,
  });
  return data;
}

export interface KakaoPayApproveResponse {
  orderId: string;
  status: string;
}

export async function kakaoPayApprove(
  orderId: string,
  pgToken: string,
): Promise<KakaoPayApproveResponse> {
  const { data } = await apiClient.post<KakaoPayApproveResponse>('/payments/kakao/approve', {
    orderId,
    pgToken,
  });
  return data;
}
