import { AlertTriangle } from 'lucide-react';

interface ErrorDisplayProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorDisplay({ message, onRetry }: ErrorDisplayProps) {
  return (
    <div className="alert alert-danger flex items-center gap-3">
      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button className="btn btn-outline text-sm py-1 px-3" onClick={onRetry}>
          Réessayer
        </button>
      )}
    </div>
  );
}
