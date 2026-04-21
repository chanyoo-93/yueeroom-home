'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useMe } from '@/lib/hooks/useMe';
import { useChildren } from '@/lib/hooks/useChildren';
import { useAddresses } from '@/lib/hooks/useAddresses';
import { queryKeys } from '@/lib/api/query-keys';
import { addChild, deleteChild, addAddress, deleteAddress, updateAddress } from '@/lib/api/users';
import ProfileForm from './ProfileForm';
import ChangePasswordForm from './ChangePasswordForm';
import ChildProfileList from './ChildProfileList';
import AddressList from './AddressList';
import WishlistTab from './WishlistTab';
import PaymentList from '@/components/payments/PaymentList';
import type { CreateChildProfileDto, CreateAddressDto } from '@/lib/types/user';

type Tab = 'profile' | 'children' | 'addresses' | 'wishlist' | 'payments';

export default function MyPageContent() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const queryClient = useQueryClient();

  const { data: user, isLoading: meLoading } = useMe();
  const { data: childProfiles = [], isLoading: childrenLoading } = useChildren();
  const { data: addresses = [], isLoading: addressesLoading } = useAddresses();

  const handleAddChild = async (dto: CreateChildProfileDto) => {
    await addChild(dto);
    await queryClient.invalidateQueries({ queryKey: queryKeys.users.children });
  };

  const handleDeleteChild = async (id: string) => {
    await deleteChild(id);
    await queryClient.invalidateQueries({ queryKey: queryKeys.users.children });
  };

  const handleAddAddress = async (dto: CreateAddressDto) => {
    await addAddress(dto);
    await queryClient.invalidateQueries({ queryKey: queryKeys.users.addresses });
  };

  const handleDeleteAddress = async (id: string) => {
    await deleteAddress(id);
    await queryClient.invalidateQueries({ queryKey: queryKeys.users.addresses });
  };

  const handleSetDefaultAddress = async (id: string) => {
    await updateAddress(id, { isDefault: true });
    await queryClient.invalidateQueries({ queryKey: queryKeys.users.addresses });
  };

  const handleProfileSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.users.me });
  };

  if (meLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-32 animate-pulse rounded bg-gray-200" />
      </div>
    );
  }

  if (!user) {
    return <p className="text-sm text-red-500">사용자 정보를 불러오는 데 실패했습니다.</p>;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'profile', label: '프로필' },
    { key: 'children', label: '자녀 정보' },
    { key: 'addresses', label: '배송지 관리' },
    { key: 'wishlist', label: '위시리스트' },
    { key: 'payments', label: '결제 내역' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">마이페이지</h1>

      <div className="border-b border-gray-200">
        <nav className="flex gap-6" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {activeTab === 'profile' && (
          <div className="space-y-8">
            <section>
              <h2 className="mb-4 text-lg font-semibold text-gray-800">기본 정보</h2>
              <ProfileForm user={user} onSuccess={handleProfileSuccess} />
            </section>
            {user.provider === 'LOCAL' && (
              <section>
                <h2 className="mb-4 text-lg font-semibold text-gray-800">비밀번호 변경</h2>
                <ChangePasswordForm />
              </section>
            )}
          </div>
        )}

        {activeTab === 'children' && (
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-800">자녀 정보</h2>
            {childrenLoading ? (
              <div className="h-24 animate-pulse rounded bg-gray-200" />
            ) : (
              <ChildProfileList
                childProfiles={childProfiles}
                onAdd={handleAddChild}
                onDelete={handleDeleteChild}
              />
            )}
          </div>
        )}

        {activeTab === 'addresses' && (
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-800">배송지 관리</h2>
            {addressesLoading ? (
              <div className="h-24 animate-pulse rounded bg-gray-200" />
            ) : (
              <AddressList
                addresses={addresses}
                onAdd={handleAddAddress}
                onDelete={handleDeleteAddress}
                onSetDefault={handleSetDefaultAddress}
              />
            )}
          </div>
        )}

        {activeTab === 'wishlist' && (
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-800">위시리스트</h2>
            <WishlistTab />
          </div>
        )}

        {activeTab === 'payments' && (
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-800">결제 내역</h2>
            <PaymentList />
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 pt-4">
        <Link href="/orders" className="text-sm text-indigo-600 hover:underline">
          주문 내역 보기 →
        </Link>
      </div>
    </div>
  );
}
