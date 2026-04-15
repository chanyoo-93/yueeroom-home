import { Suspense } from 'react';
import MyPageContent from '@/components/my-page/MyPageContent';

export const metadata = { title: '마이페이지 | 유이룸' };

export default function MyPage() {
  return (
    <div className="mx-auto max-w-2xl py-4">
      <Suspense fallback={null}>
        <MyPageContent />
      </Suspense>
    </div>
  );
}
