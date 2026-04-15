'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import apiClient from '@/lib/api/client';
import type { UserProfile } from '@/lib/types/user';

interface FormValues {
  name: string;
  phone: string;
}

interface Props {
  user: UserProfile;
  onSuccess?: () => void;
}

export default function ProfileForm({ user, onSuccess }: Props) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    defaultValues: { name: user.name, phone: user.phone ?? '' },
  });

  useEffect(() => {
    reset({ name: user.name, phone: user.phone ?? '' });
  }, [user, reset]);

  const onSubmit = async (data: FormValues) => {
    setSuccessMessage(null);
    try {
      await apiClient.patch('/users/me', {
        name: data.name,
        phone: data.phone || undefined,
      });
      setSuccessMessage('프로필이 저장되었습니다.');
      reset(data);
      onSuccess?.();
    } catch {
      setError('root', { message: '프로필 저장 중 오류가 발생했습니다.' });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-sm space-y-4" noValidate>
      {successMessage && (
        <p role="status" className="text-sm text-green-600">
          {successMessage}
        </p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">이메일</label>
        <p className="mt-1 rounded border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500">
          {user.email}
        </p>
      </div>

      <div>
        <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700">
          이름
        </label>
        <input
          id="profile-name"
          type="text"
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
          {...register('name', {
            required: '이름을 입력해주세요.',
            minLength: { value: 2, message: '이름은 2자 이상이어야 합니다.' },
          })}
        />
        {errors.name && (
          <p role="alert" className="mt-1 text-xs text-red-600">
            {errors.name.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="profile-phone" className="block text-sm font-medium text-gray-700">
          전화번호
        </label>
        <input
          id="profile-phone"
          type="tel"
          placeholder="010-0000-0000"
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
          {...register('phone')}
        />
      </div>

      {errors.root && (
        <p role="alert" className="text-xs text-red-600">
          {errors.root.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !isDirty}
        className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isSubmitting ? '저장 중...' : '저장'}
      </button>
    </form>
  );
}
