'use client';

import { useEffect } from 'react';
import DaumPostcode from 'react-daum-postcode';

interface Props {
  isOpen: boolean;
  onComplete: (zipCode: string, address1: string) => void;
  onClose: () => void;
}

export default function DaumPostcodeModal({ isOpen, onComplete, onClose }: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      data-testid="postcode-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold text-gray-900">주소 검색</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        <DaumPostcode
          onComplete={(data) => {
            onComplete(data.zonecode, data.roadAddress || data.jibunAddress);
          }}
          style={{ height: 400 }}
        />
      </div>
    </div>
  );
}
