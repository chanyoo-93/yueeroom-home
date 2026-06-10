'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import DaumPostcodeModal from '@/components/address/DaumPostcodeModal';
import type { CreateAddressDto } from '@/lib/types/user';

interface FormValues {
  name: string;
  recipient: string;
  phone: string;
  address2: string;
}

interface Props {
  onSubmit: (dto: CreateAddressDto) => Promise<void>;
  onCancel: () => void;
}

export default function AddressForm({ onSubmit, onCancel }: Props) {
  const [isPostcodeOpen, setIsPostcodeOpen] = useState(false);
  const [zipCode, setZipCode] = useState('');
  const [address1, setAddress1] = useState('');
  const [addressError, setAddressError] = useState('');
  const address2Ref = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  const handlePostcodeComplete = (newZipCode: string, newAddress1: string) => {
    setZipCode(newZipCode);
    setAddress1(newAddress1);
    setAddressError('');
    setIsPostcodeOpen(false);
    address2Ref.current?.focus();
  };

  const handleCancel = () => {
    onCancel();
    reset();
    setZipCode('');
    setAddress1('');
  };

  const handleFormSubmit = async (data: FormValues) => {
    if (!zipCode) {
      setAddressError('주소 검색을 먼저 진행해주세요.');
      return;
    }
    await onSubmit({
      name: data.name,
      recipient: data.recipient,
      phone: data.phone,
      zipCode,
      address1,
      address2: data.address2 || undefined,
    });
    reset();
    setZipCode('');
    setAddress1('');
  };

  const { ref: address2FormRef, ...address2Rest } = register('address2');

  return (
    <>
      <DaumPostcodeModal
        isOpen={isPostcodeOpen}
        onComplete={handlePostcodeComplete}
        onClose={() => setIsPostcodeOpen(false)}
      />
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
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
          <label className="block text-sm font-medium text-gray-700">주소</label>
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              readOnly
              value={zipCode}
              placeholder="우편번호"
              className="w-24 rounded border bg-gray-50 px-3 py-2 text-sm text-gray-700"
            />
            <button
              type="button"
              onClick={() => setIsPostcodeOpen(true)}
              className="rounded border border-indigo-400 px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50"
            >
              주소 검색
            </button>
          </div>
          {address1 && (
            <input
              type="text"
              readOnly
              value={address1}
              className="mt-1 w-full rounded border bg-gray-50 px-3 py-2 text-sm text-gray-700"
            />
          )}
          {addressError && (
            <p role="alert" className="mt-1 text-xs text-red-600">
              {addressError}
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
            placeholder="동·호수 직접 입력"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            ref={(el) => {
              address2FormRef(el);
              address2Ref.current = el;
            }}
            {...address2Rest}
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
            onClick={handleCancel}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600"
          >
            취소
          </button>
        </div>
      </form>
    </>
  );
}
