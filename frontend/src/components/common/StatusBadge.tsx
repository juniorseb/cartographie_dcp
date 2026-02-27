import type { StatutConformite } from '@/types/enums';
import { STATUT_CONFORMITE_BADGE, STATUT_CONFORMITE_LABELS } from '@/utils/constants';

interface StatusBadgeProps {
  statut: StatutConformite | null;
}

export default function StatusBadge({ statut }: StatusBadgeProps) {
  if (!statut) return <span className="badge bg-gray-200 text-gray-600">N/A</span>;

  return (
    <span className={STATUT_CONFORMITE_BADGE[statut]}>
      {STATUT_CONFORMITE_LABELS[statut]}
    </span>
  );
}
