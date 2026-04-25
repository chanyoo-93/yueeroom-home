import Link from 'next/link';

export default function MainBanner() {
  return (
    <section
      aria-label="메인 배너"
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 px-8 py-16 text-center sm:py-24"
    >
      <div className="relative z-10 mx-auto max-w-xl space-y-4">
        <p className="text-sm font-medium uppercase tracking-widest text-indigo-500">
          New Collection
        </p>
        <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">유이룸</h1>
        <p className="text-lg text-gray-600">프리미엄 유아/아동복 & 악세사리</p>
        <Link
          href="/products"
          className="mt-6 inline-block rounded-full bg-indigo-600 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          상품 보기
        </Link>
      </div>
      {/* 장식용 원형 요소 */}
      <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indigo-200/40" />
      <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-blue-200/40" />
    </section>
  );
}
