'use client';

interface Props {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="페이지 탐색" className="flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="이전 페이지"
        className="rounded border px-3 py-1.5 text-sm disabled:opacity-40"
      >
        이전
      </button>

      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          aria-label={`${p}페이지`}
          aria-current={p === page ? 'page' : undefined}
          className={`rounded border px-3 py-1.5 text-sm ${
            p === page ? 'bg-indigo-600 text-white' : 'hover:bg-gray-50'
          }`}
        >
          {p}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="다음 페이지"
        className="rounded border px-3 py-1.5 text-sm disabled:opacity-40"
      >
        다음
      </button>
    </nav>
  );
}
