import { Download } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface ExportButtonProps {
  onExport: (format: 'excel' | 'csv' | 'pdf') => void;
  isLoading?: boolean;
}

export default function ExportButton({ onExport, isLoading }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        className="btn btn-secondary flex items-center gap-2 py-2 px-4"
        onClick={() => setOpen(!open)}
        disabled={isLoading}
      >
        <Download className="w-4 h-4" />
        {isLoading ? 'Export...' : 'Exporter'}
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-white rounded shadow-lg border z-50">
          {[
            { format: 'excel' as const, label: 'Excel (.xlsx)' },
            { format: 'csv' as const, label: 'CSV (.csv)' },
            { format: 'pdf' as const, label: 'PDF (.pdf)' },
          ].map(({ format, label }) => (
            <button
              key={format}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
              onClick={() => {
                onExport(format);
                setOpen(false);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
