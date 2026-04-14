'use client';

export type SortOrder = 'latest' | 'price_asc' | 'price_desc';

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: 'latest', label: '최신순' },
  { value: 'price_asc', label: '가격 낮은순' },
  { value: 'price_desc', label: '가격 높은순' },
];

interface Props {
  value: SortOrder;
  onChange: (sort: SortOrder) => void;
}

export default function SortDropdown({ value, onChange }: Props) {
  return (
    <select
      aria-label="정렬 기준"
      value={value}
      onChange={(e) => onChange(e.target.value as SortOrder)}
      className="rounded border border-gray-300 px-3 py-1.5 text-sm"
    >
      {SORT_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
