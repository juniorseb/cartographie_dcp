import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';

interface PaginationProps {
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  page,
  totalPages,
  hasNext,
  hasPrev,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-4 py-4">
      <button
        className={cn('btn btn-outline py-2 px-3', !hasPrev && 'opacity-50 cursor-not-allowed')}
        onClick={() => onPageChange(page - 1)}
        disabled={!hasPrev}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-sm text-gray-600">
        Page <strong>{page}</strong> sur <strong>{totalPages}</strong>
      </span>
      <button
        className={cn('btn btn-outline py-2 px-3', !hasNext && 'opacity-50 cursor-not-allowed')}
        onClick={() => onPageChange(page + 1)}
        disabled={!hasNext}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
