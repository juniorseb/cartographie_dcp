import { Search, type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
}

export default function EmptyState({
  title = 'Aucun résultat',
  description = 'Aucune donnée ne correspond à vos critères de recherche.',
  icon: Icon = Search,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="w-16 h-16 text-gray-300 mb-4" />
      <h3 className="text-lg font-semibold text-gray-600 mb-2">{title}</h3>
      <p className="text-sm text-gray-400 max-w-md">{description}</p>
    </div>
  );
}
