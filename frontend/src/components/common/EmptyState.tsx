import type { ReactNode } from 'react';
import { Search, type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  /** Bouton ou lien d'action optionnel (ex. « Créer un enregistrement »). */
  action?: ReactNode;
  /** Affiche l'etat vide dans une carte blanche (par defaut : fond transparent). */
  card?: boolean;
}

export default function EmptyState({
  title = 'Aucun résultat',
  description = 'Aucune donnée ne correspond à vos critères de recherche.',
  icon: Icon = Search,
  action,
  card = false,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center px-6 py-14 text-center ${
        card ? 'card' : 'rounded-[var(--radius-card)] border-2 border-dashed border-[var(--brand-gray)] bg-white/60'
      }`}
    >
      <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-primary-soft)]">
        <Icon className="h-8 w-8 text-[var(--brand-primary)]" />
      </span>
      <h3 className="text-lg font-bold text-[var(--brand-dark)]">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-md text-sm text-[var(--brand-muted)]">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
