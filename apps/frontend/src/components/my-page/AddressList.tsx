'use client';

import { useState } from 'react';
import AddressForm from '@/components/address/AddressForm';
import type { Address, CreateAddressDto } from '@/lib/types/user';

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

  const handleAdd = async (dto: CreateAddressDto) => {
    await onAdd(dto);
    setIsAdding(false);
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
        <AddressForm onSubmit={handleAdd} onCancel={() => setIsAdding(false)} />
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
