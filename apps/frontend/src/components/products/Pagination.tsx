'use client';

interface Props {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

function getVisiblePages(page: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const delta = 2;
  const pages: (number | 'ellipsis')[] = [1];

  const rangeStart = Math.max(2, page - delta);
  const rangeEnd = Math.min(totalPages - 1, page + delta);

  if (rangeStart > 2) pages.push('ellipsis');
  for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
  if (rangeEnd < totalPages - 1) pages.push('ellipsis');

  pages.push(totalPages);
  return pages;
}

export default function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null;

  const visiblePages = getVisiblePages(page, totalPages);

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

      {visiblePages.map((p, idx) =>
        p === 'ellipsis' ? (
          <span key={`ellipsis-${idx}`} className="px-1 text-gray-400" aria-hidden="true">
            ...
          </span>
        ) : (
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
        ),
      )}

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
