import Link from 'next/link';
import MiniCart from './MiniCart';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center gap-4 px-4">
        {/* 로고 */}
        <Link href="/" className="shrink-0 text-xl font-bold text-gray-900">
          유이룸
        </Link>

        {/* 검색창 */}
        <form className="flex flex-1 items-center" action="/search" method="GET">
          <input
            type="search"
            name="q"
            placeholder="상품 검색"
            aria-label="상품 검색"
            className="w-full rounded-full border border-gray-300 px-4 py-1.5 text-sm outline-none focus:border-blue-500"
          />
        </form>

        {/* 우측 아이콘/링크 */}
        <nav className="flex shrink-0 items-center gap-4">
          <MiniCart />
          <Link
            href="/mypage"
            aria-label="마이페이지"
            className="flex flex-col items-center text-xs text-gray-600 hover:text-blue-600"
          >
            <span className="text-lg">👤</span>
            <span className="hidden sm:inline">마이페이지</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
