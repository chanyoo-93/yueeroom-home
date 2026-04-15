'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import apiClient from '@/lib/api/client';

interface FormValues {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export default function ChangePasswordForm() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  const onSubmit = async (data: FormValues) => {
    setSuccessMessage(null);
    try {
      await apiClient.patch('/users/me/password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setSuccessMessage('비밀번호가 성공적으로 변경되었습니다.');
      reset();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 401) {
          setError('currentPassword', { message: '현재 비밀번호가 올바르지 않습니다.' });
        } else if (status === 400) {
          setError('newPassword', { message: '새 비밀번호는 현재 비밀번호와 달라야 합니다.' });
        } else {
          setError('root', { message: '비밀번호 변경 중 오류가 발생했습니다.' });
        }
      } else {
        setError('root', { message: '비밀번호 변경 중 오류가 발생했습니다.' });
      }
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
        <label htmlFor="current-password" className="block text-sm font-medium text-gray-700">
          현재 비밀번호
        </label>
        <input
          id="current-password"
          type="password"
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
          {...register('currentPassword', { required: '현재 비밀번호를 입력해주세요.' })}
        />
        {errors.currentPassword && (
          <p role="alert" className="mt-1 text-xs text-red-600">
            {errors.currentPassword.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
          새 비밀번호
        </label>
        <input
          id="new-password"
          type="password"
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
          {...register('newPassword', {
            required: '새 비밀번호를 입력해주세요.',
            minLength: { value: 8, message: '비밀번호는 최소 8자 이상이어야 합니다.' },
          })}
        />
        {errors.newPassword && (
          <p role="alert" className="mt-1 text-xs text-red-600">
            {errors.newPassword.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="confirm-new-password" className="block text-sm font-medium text-gray-700">
          새 비밀번호 확인
        </label>
        <input
          id="confirm-new-password"
          type="password"
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
          {...register('confirmNewPassword', {
            required: '비밀번호 확인을 입력해주세요.',
            validate: (value) => value === watch('newPassword') || '비밀번호가 일치하지 않습니다.',
          })}
        />
        {errors.confirmNewPassword && (
          <p role="alert" className="mt-1 text-xs text-red-600">
            {errors.confirmNewPassword.message}
          </p>
        )}
      </div>

      {errors.root && (
        <p role="alert" className="text-xs text-red-600">
          {errors.root.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isSubmitting ? '변경 중...' : '비밀번호 변경'}
      </button>
    </form>
  );
}
