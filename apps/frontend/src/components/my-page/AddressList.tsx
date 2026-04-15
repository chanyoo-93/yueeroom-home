'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Address, CreateAddressDto } from '@/lib/types/user';

interface FormValues {
  name: string;
  recipient: string;
  phone: string;
  zipCode: string;
  address1: string;
  address2: string;
}

interface Props {
  addresses: Address[];
  onAdd: (dto: CreateAddressDto) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSetDefault: (id: string) => Promise<void>;
}

export default function AddressList({ addresses, onAdd, onDelete, onSetDefault }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  const handleAdd = async (data: FormValues) => {
    await onAdd({
      name: data.name,
      recipient: data.recipient,
      phone: data.phone,
      zipCode: data.zipCode,
      address1: data.address1,
      address2: data.address2 || undefined,
    });
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

  const handleSetDefault = async (id: string) => {
    setSettingDefaultId(id);
    try {
      await onSetDefault(id);
    } finally {
      setSettingDefaultId(null);
    }
  };

  return (
    <div className="space-y-4">
      {addresses.length === 0 ? (
        <p className="text-sm text-gray-500">등록된 배송지가 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {addresses.map((address) => (
            <li key={address.id} className="rounded-lg border border-gray-200 px-4 py-3">
              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{address.name}</p>
                    {address.isDefault && (
                      <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-medium text-indigo-700">
                        기본
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">
                    {address.recipient} · {address.phone}
                  </p>
                  <p className="text-xs text-gray-500">
                    {address.zipCode} {address.address1}
                    {address.address2 ? ` ${address.address2}` : ''}
                  </p>
                </div>
                <div className="flex gap-2 text-xs">
                  {!address.isDefault && (
                    <button
                      onClick={() => handleSetDefault(address.id)}
                      disabled={settingDefaultId === address.id}
                      aria-label={`${address.name} 기본 배송지로 설정`}
                      className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                    >
                      기본 설정
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(address.id)}
                    disabled={deletingId === address.id}
                    aria-label={`${address.name} 삭제`}
                    className="text-red-500 hover:text-red-700 disabled:opacity-50"
                  >
                    삭제
                  </button>
                </div>
              </div>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="addr-name" className="block text-sm font-medium text-gray-700">
                배송지명
              </label>
              <input
                id="addr-name"
                type="text"
                placeholder="집, 회사"
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                {...register('name', { required: '배송지명을 입력해주세요.' })}
              />
              {errors.name && (
                <p role="alert" className="mt-1 text-xs text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="addr-recipient" className="block text-sm font-medium text-gray-700">
                수령인
              </label>
              <input
                id="addr-recipient"
                type="text"
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                {...register('recipient', { required: '수령인을 입력해주세요.' })}
              />
              {errors.recipient && (
                <p role="alert" className="mt-1 text-xs text-red-600">
                  {errors.recipient.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="addr-phone" className="block text-sm font-medium text-gray-700">
                연락처
              </label>
              <input
                id="addr-phone"
                type="tel"
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                {...register('phone', { required: '연락처를 입력해주세요.' })}
              />
              {errors.phone && (
                <p role="alert" className="mt-1 text-xs text-red-600">
                  {errors.phone.message}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="addr-zipCode" className="block text-sm font-medium text-gray-700">
                우편번호
              </label>
              <input
                id="addr-zipCode"
                type="text"
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                {...register('zipCode', { required: '우편번호를 입력해주세요.' })}
              />
              {errors.zipCode && (
                <p role="alert" className="mt-1 text-xs text-red-600">
                  {errors.zipCode.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="addr-address1" className="block text-sm font-medium text-gray-700">
              주소
            </label>
            <input
              id="addr-address1"
              type="text"
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              {...register('address1', { required: '주소를 입력해주세요.' })}
            />
            {errors.address1 && (
              <p role="alert" className="mt-1 text-xs text-red-600">
                {errors.address1.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="addr-address2" className="block text-sm font-medium text-gray-700">
              상세주소
            </label>
            <input
              id="addr-address2"
              type="text"
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              {...register('address2')}
            />
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
          + 배송지 추가
        </button>
      )}
    </div>
  );
}
