import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  /** Petit libelle au-dessus du titre (ex. « Registre public »). */
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  /** Boutons alignes a droite (export, creation...). */
  actions?: ReactNode;
  /** Bandeau pleine largeur (pages publiques) ou simple en-tete (espaces connectes). */
  variant?: 'band' | 'plain';
}

/** En-tete de page commun : surtitre, titre, description et actions. */
export default function PageHeader({
  eyebrow, title, description, icon: Icon, actions, variant = 'plain',
}: PageHeaderProps) {
  const inner = (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex items-start gap-4 min-w-0">
        {Icon && (
          <span
            className={
              variant === 'band'
                ? 'hidden sm:flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-primary)] text-white shadow-[0_8px_20px_rgba(255,140,0,0.25)]'
                : 'hidden sm:flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]'
            }
          >
            <Icon className="h-6 w-6" />
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--brand-primary-hover)]">
              {eyebrow}
            </p>
          )}
          <h1 className="mt-1 text-2xl md:text-[28px] leading-tight">{title}</h1>
          {description && (
            <p className="mt-2 max-w-3xl text-sm md:text-[15px] text-[var(--brand-muted)]">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex flex-shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );

  if (variant === 'band') {
    return (
      <section className="relative overflow-hidden border-b border-[var(--brand-gray)] bg-white">
        <div aria-hidden className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[var(--brand-primary)] opacity-[0.07] blur-2xl" />
        <div aria-hidden className="absolute right-40 -bottom-28 h-56 w-56 rounded-full bg-[var(--brand-secondary)] opacity-[0.07] blur-2xl" />
        <div className="relative mx-auto max-w-7xl px-4 md:px-8 py-8 md:py-10">{inner}</div>
      </section>
    );
  }
  return <div className="mb-6">{inner}</div>;
}
