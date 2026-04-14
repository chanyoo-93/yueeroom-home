'use client';

interface SizeRow {
  size: string;
  age: string;
  height: string;
  weight: string;
  chest: string;
  waist: string;
}

const SIZE_GUIDE: SizeRow[] = [
  { size: '80', age: '12개월', height: '80cm', weight: '11kg', chest: '47cm', waist: '46cm' },
  { size: '90', age: '18개월', height: '90cm', weight: '13kg', chest: '49cm', waist: '47cm' },
  { size: '100', age: '2~3세', height: '100cm', weight: '16kg', chest: '53cm', waist: '50cm' },
  { size: '110', age: '3~4세', height: '110cm', weight: '19kg', chest: '57cm', waist: '52cm' },
  { size: '120', age: '5~6세', height: '120cm', weight: '23kg', chest: '61cm', waist: '54cm' },
  { size: '130', age: '7~8세', height: '130cm', weight: '28kg', chest: '65cm', waist: '57cm' },
  { size: '140', age: '9~10세', height: '140cm', weight: '34kg', chest: '70cm', waist: '60cm' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function SizeGuideModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="사이즈 가이드"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* 오버레이 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      {/* 모달 본문 */}
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">사이즈 가이드</h2>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 안내 문구 */}
        <p className="px-6 pt-4 text-sm text-gray-500">
          아이마다 체형이 다를 수 있으니 신체 치수를 기준으로 선택해 주세요.
        </p>

        {/* 사이즈 표 */}
        <div className="overflow-x-auto px-6 pb-6 pt-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500">
                <th className="py-2 pr-3 text-left font-medium">사이즈</th>
                <th className="py-2 pr-3 text-left font-medium">연령</th>
                <th className="py-2 pr-3 text-left font-medium">키</th>
                <th className="py-2 pr-3 text-left font-medium">몸무게</th>
                <th className="py-2 pr-3 text-left font-medium">가슴둘레</th>
                <th className="py-2 text-left font-medium">허리둘레</th>
              </tr>
            </thead>
            <tbody>
              {SIZE_GUIDE.map((row) => (
                <tr key={row.size} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 pr-3 font-semibold text-gray-900">{row.size}</td>
                  <td className="py-2 pr-3 text-gray-700">{row.age}</td>
                  <td className="py-2 pr-3 text-gray-700">{row.height}</td>
                  <td className="py-2 pr-3 text-gray-700">{row.weight}</td>
                  <td className="py-2 pr-3 text-gray-700">{row.chest}</td>
                  <td className="py-2 text-gray-700">{row.waist}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
