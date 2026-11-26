import { Link } from 'react-router-dom';
import { MapPin, Briefcase, ArrowRight } from 'lucide-react';
import type { EntiteListItem } from '@/types/entite';
import { STATUT_COLORS, STATUT_CONFORMITE_LABELS } from '@/utils/constants';

interface EntityPopupProps {
  entite: EntiteListItem;
}

export default function EntityPopup({ entite }: EntityPopupProps) {
  const statut = entite.statut_conformite;
  const color = (statut && STATUT_COLORS[statut]) || '#94A3B8';
  const lieu = [entite.ville, entite.region].filter(Boolean).join(', ');

  return (
    <div className="min-w-[280px] max-w-[300px] overflow-hidden">
      {/* Bandeau statut */}
      <div className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white" style={{ background: color }}>
        <span className="h-2 w-2 rounded-full bg-white" />
        {statut ? STATUT_CONFORMITE_LABELS[statut] : 'Statut non renseigné'}
      </div>

      <div className="p-4">
        <h4 className="font-display text-base font-bold leading-snug text-[var(--brand-dark)]">
          {entite.denomination}
        </h4>

        <div className="mt-2 space-y-1">
          {entite.secteur_activite && (
            <p className="flex items-start gap-1.5 text-[13px] text-[var(--brand-muted)]">
              <Briefcase className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              {entite.secteur_activite}
            </p>
          )}
          {lieu && (
            <p className="flex items-start gap-1.5 text-[13px] text-[var(--brand-muted)]">
              <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              {lieu}
            </p>
          )}
        </div>

        {/* Finalites principales en barres */}
        {entite.finalites_top && entite.finalites_top.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--brand-dark)]">
              Finalités principales
            </p>
            <ul className="space-y-2">
              {entite.finalites_top.map((f, i) => (
                <li key={i}>
                  <div className="flex justify-between gap-2 text-[12px] text-[#334155]">
                    <span className="truncate">{f.nom}</span>
                    <span className="font-semibold">{f.pourcentage}%</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-[var(--brand-gray)]">
                    <div
                      className="h-full rounded-full bg-[var(--brand-primary)]"
                      style={{ width: `${Math.min(100, Math.max(0, f.pourcentage))}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Link
          to={`/entites/${entite.id}`}
          state={{ from: '/carte' }}
          className="popup-btn mt-4 flex w-full items-center justify-center gap-1.5 rounded-[10px] bg-[var(--brand-primary)] py-2.5 font-display text-sm font-bold text-white no-underline transition-colors hover:bg-[var(--brand-primary-hover)]"
        >
          Voir la fiche
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
