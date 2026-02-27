import { cn } from '@/utils/cn';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullPage?: boolean;
}

const sizeClasses = {
  sm: 'w-5 h-5 border-2',
  md: 'w-10 h-10 border-4',
  lg: 'w-16 h-16 border-4',
};

export default function Loading({ size = 'md', text, fullPage }: LoadingProps) {
  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={cn('spinner', sizeClasses[size])} />
      {text && <p className="text-sm text-gray-500">{text}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        {spinner}
      </div>
    );
  }

  return spinner;
}
