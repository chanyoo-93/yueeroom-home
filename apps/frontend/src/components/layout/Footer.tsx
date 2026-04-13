import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50 pb-20 pt-8 md:pb-8">
      <div className="mx-auto max-w-screen-xl px-4">
        {/* SNS 링크 */}
        <div className="mb-6 flex gap-4">
          <Link
            href="https://instagram.com/yueeroom"
            aria-label="인스타그램"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            인스타그램
          </Link>
          <Link
            href="https://youtube.com/@yueeroom"
            aria-label="유튜브"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            유튜브
          </Link>
        </div>

        {/* 고객센터 */}
        <div className="mb-6">
          <p className="mb-1 text-sm font-semibold text-gray-800">고객센터</p>
          <p className="text-sm text-gray-600">1588-0000</p>
          <p className="text-sm text-gray-500">평일 09:00 ~ 18:00 (주말 · 공휴일 휴무)</p>
        </div>

        {/* 약관 링크 */}
        <div className="mb-6 flex gap-4">
          <Link href="/terms" className="text-sm text-gray-600 hover:text-gray-900">
            이용약관
          </Link>
          <Link href="/privacy" className="text-sm font-semibold text-gray-600 hover:text-gray-900">
            개인정보처리방침
          </Link>
        </div>

        {/* 사업자 정보 */}
        <div className="text-xs text-gray-400">
          <p className="font-medium text-gray-600">유이룸</p>
          <p>사업자등록번호: 000-00-00000</p>
          <p>대표: 홍길동 | 주소: 서울특별시 강남구 테헤란로 000</p>
          <p>이메일: cs@yueeroom.com</p>
          <p className="mt-2">© 2024 유이룸. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
