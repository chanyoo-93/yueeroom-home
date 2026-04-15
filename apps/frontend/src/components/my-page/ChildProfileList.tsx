'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { ChildProfile, CreateChildProfileDto } from '@/lib/types/user';

interface FormValues {
  name: string;
  birthDate: string;
}

interface Props {
  childProfiles: ChildProfile[];
  onAdd: (dto: CreateChildProfileDto) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function ChildProfileList({ childProfiles, onAdd, onDelete }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  const handleAdd = async (data: FormValues) => {
    await onAdd({ name: data.name, birthDate: data.birthDate });
    reset();
    setIsAdding(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {childProfiles.length === 0 ? (
        <p className="text-sm text-gray-500">등록된 자녀 정보가 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {childProfiles.map((child) => (
            <li
              key={child.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{child.name}</p>
                <p className="text-xs text-gray-500">{child.birthDate.slice(0, 10)}</p>
              </div>
              <button
                onClick={() => handleDelete(child.id)}
                disabled={deletingId === child.id}
                aria-label={`${child.name} 삭제`}
                className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}

      {isAdding ? (
        <form
          onSubmit={handleSubmit(handleAdd)}
          className="space-y-3 rounded-lg border border-indigo-100 bg-indigo-50 p-4"
          noValidate
        >
          <div>
            <label htmlFor="child-name" className="block text-sm font-medium text-gray-700">
              이름
            </label>
            <input
              id="child-name"
              type="text"
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              {...register('name', { required: '이름을 입력해주세요.' })}
            />
            {errors.name && (
              <p role="alert" className="mt-1 text-xs text-red-600">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="child-birthDate" className="block text-sm font-medium text-gray-700">
              생년월일
            </label>
            <input
              id="child-birthDate"
              type="date"
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              {...register('birthDate', { required: '생년월일을 입력해주세요.' })}
            />
            {errors.birthDate && (
              <p role="alert" className="mt-1 text-xs text-red-600">
                {errors.birthDate.message}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {isSubmitting ? '저장 중...' : '추가'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                reset();
              }}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600"
            >
              취소
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1 text-sm text-indigo-600 hover:underline"
        >
          + 자녀 추가
        </button>
      )}
    </div>
  );
}
