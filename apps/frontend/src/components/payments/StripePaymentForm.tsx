'use client';

import { useState } from 'react';
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { createPaymentIntent } from '@/lib/api/payments';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '');

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#1f2937',
      '::placeholder': { color: '#9ca3af' },
    },
    invalid: { color: '#ef4444' },
  },
};

interface CardFormProps {
  orderId: string;
  onSuccess: () => void;
}

function CardForm({ orderId, onSuccess }: CardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { clientSecret } = await createPaymentIntent(orderId);

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error('카드 입력 오류');

      const { error } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardElement },
      });

      if (error) {
        setErrorMessage(error.message ?? '결제에 실패했습니다.');
      } else {
        onSuccess();
      }
    } catch {
      setErrorMessage('결제 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div className="rounded-xl border border-gray-200 p-4">
        <CardElement options={CARD_ELEMENT_OPTIONS} />
      </div>

      {errorMessage && (
        <p role="alert" className="text-sm text-red-600">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {isProcessing ? '결제 처리 중...' : '카드 결제'}
      </button>
    </form>
  );
}

interface StripePaymentFormProps {
  orderId: string;
  onSuccess: () => void;
}

export default function StripePaymentForm({ orderId, onSuccess }: StripePaymentFormProps) {
  return (
    <Elements stripe={stripePromise}>
      <CardForm orderId={orderId} onSuccess={onSuccess} />
    </Elements>
  );
}
