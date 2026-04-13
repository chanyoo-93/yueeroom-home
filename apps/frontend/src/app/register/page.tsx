'use client';

import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { apiClient } from '@/lib/api/client';

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>();

  const onSubmit = async (data: RegisterForm) => {
    try {
      await apiClient.post('/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
      });
      router.push('/pending');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setError('email', { message: '이미 사용 중인 이메일입니다.' });
      } else {
        setError('root', { message: '가입 신청 중 오류가 발생했습니다.' });
      }
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-center text-2xl font-bold">회원가입 신청</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label htmlFor="name" className="block text-sm font-medium">
              이름
            </label>
            <input
              id="name"
              type="text"
              className="mt-1 w-full rounded border px-3 py-2"
              {...register('name', { required: '이름을 입력해주세요.' })}
            />
            {errors.name && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                {errors.name.message}
              </p>
            )}
          </div>

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

          <div>
            <label htmlFor="passwordConfirm" className="block text-sm font-medium">
              비밀번호 확인
            </label>
            <input
              id="passwordConfirm"
              type="password"
              className="mt-1 w-full rounded border px-3 py-2"
              {...register('passwordConfirm', {
                required: '비밀번호 확인을 입력해주세요.',
                validate: (value) => value === watch('password') || '비밀번호가 일치하지 않습니다.',
              })}
            />
            {errors.passwordConfirm && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                {errors.passwordConfirm.message}
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
            가입 신청
          </button>
        </form>
      </div>
    </main>
  );
}
