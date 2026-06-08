'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { apiClient } from '@/lib/api/client';
import { mergeCart } from '@/lib/api/cart';
import { useCartStore } from '@/lib/stores/cart';

interface LoginForm {
  email: string;
  password: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export default function LoginPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    try {
      await apiClient.post('/auth/login', data);

      // 로컬 장바구니가 있으면 서버에 병합하고 초기화
      const localItems = useCartStore.getState().items;
      if (localItems.length > 0) {
        try {
          await mergeCart(
            localItems.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
          );
          useCartStore.getState().clearCart();
        } catch {
          // 병합 실패 시 로그인 흐름은 계속 진행
        }
      }

      router.push('/');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setError('root', { message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
      } else {
        setError('root', { message: '로그인 중 오류가 발생했습니다.' });
      }
    }
  };

  const handleSocialLogin = (provider: 'naver' | 'kakao') => {
    window.location.href = `${API_URL}/auth/${provider}`;
  };

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-center text-2xl font-bold">로그인</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              이메일
            </label>
            <input
              id="email"
              type="email"
              className="mt-1 w-full rounded border px-3 py-2"
              {...register('email', {
                required: '이메일을 입력해주세요.',
                pattern: {
                  value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                  message: '올바른 이메일 형식이 아닙니다.',
                },
              })}
            />
            {errors.email && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              className="mt-1 w-full rounded border px-3 py-2"
              {...register('password', { required: '비밀번호를 입력해주세요.' })}
            />
            {errors.password && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>

          {errors.root && (
            <p role="alert" className="text-sm text-red-600">
              {errors.root.message}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded bg-blue-600 py-2 text-white disabled:opacity-50"
          >
            로그인
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          계정이 없으신가요?{' '}
          <Link href="/register" className="text-blue-600 hover:underline">
            회원가입
          </Link>
        </p>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => handleSocialLogin('naver')}
            className="w-full rounded bg-green-500 py-2 text-white"
          >
            네이버로 로그인
          </button>
          <button
            type="button"
            onClick={() => handleSocialLogin('kakao')}
            className="w-full rounded bg-yellow-400 py-2 text-black"
          >
            카카오로 로그인
          </button>
        </div>
      </div>
    </main>
  );
}
