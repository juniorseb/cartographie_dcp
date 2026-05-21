/**
 * Panneau d'audit trail d'un dossier (manœuvre A).
 * Affiche en timeline tous les evenements du dossier (append-only).
 */
import { useEffect, useState } from 'react';
import {
  History, ChevronDown, Send, RotateCcw, CheckSquare, Globe,
  MessageSquare, CheckCircle2, Pencil, Award, EyeOff, Eye,
  UserCheck,
} from 'lucide-react';
import * as adminApi from '@/api/admin.api';
import type { DossierEvenementItem } from '@/api/admin.api';

const TYPE_VISUAL: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  soumission: { icon: Send, color: 'text-blue-700', label: 'Soumission' },
  re_soumission: { icon: Send, color: 'text-blue-700', label: 'Re-soumission' },
  retour_entreprise: { icon: RotateCcw, color: 'text-orange-700', label: 'Retour à l\'entreprise' },
  validation_n_plus_1: { icon: CheckSquare, color: 'text-green-700', label: 'Validation' },
  publication: { icon: Globe, color: 'text-green-700', label: 'Publication' },
  depublication: { icon: EyeOff, color: 'text-red-700', label: 'Dépublication' },
  depublication_auto: { icon: EyeOff, color: 'text-red-700', label: 'Dépublication automatique' },
  re_publication: { icon: Eye, color: 'text-green-700', label: 'Republication' },
  republication_possible: { icon: Eye, color: 'text-blue-700', label: 'Republication possible' },
  assignation: { icon: UserCheck, color: 'text-purple-700', label: 'Assignation' },
  re_assignation: { icon: UserCheck, color: 'text-purple-700', label: 'Réassignation' },
  commentaire_ajoute: { icon: MessageSquare, color: 'text-orange-700', label: 'Commentaire ajouté' },
  commentaire_resolu: { icon: CheckCircle2, color: 'text-green-700', label: 'Commentaire résolu' },
  commentaire_repondu: { icon: MessageSquare, color: 'text-blue-700', label: 'Commentaire répondu' },
  score_modifie: { icon: Award, color: 'text-orange-700', label: 'Score modifié' },
  formalite_deposee: { icon: Pencil, color: 'text-blue-700', label: 'Formalité déposée' },
};

function defaultVisual(type: string) {
  return { icon: History, color: 'text-gray-600', label: type };
}

function describePayload(type: string, payload: Record<string, unknown>): string {
  if (!payload) return '';
  if (type === 'score_modifie') {
    return `Score : ${payload.score_avant ?? '?'} → ${payload.score_apres ?? '?'}`;
  }
  if (type === 'depublication_auto') {
    return `Score retombé à ${payload.score_apres ?? '?'} (avant : ${payload.score_avant ?? '?'})`;
  }
  if (type === 'soumission' || type === 're_soumission') {
    return `Révision #${payload.numero_revision ?? '?'}`;
  }
  if (type === 'commentaire_ajoute' || type === 'commentaire_resolu' || type === 'commentaire_repondu') {
    return `Rubrique : ${payload.rubrique ?? '?'}`;
  }
  if (type === 'validation_n_plus_1') {
    return `Décision : ${payload.decision ?? '?'} · Score final : ${payload.score_final ?? '?'}`;
  }
  if (type === 'retour_entreprise') {
    return payload.motif ? `Motif : ${payload.motif}` : '';
  }
  return '';
}

interface DossierAuditTrailProps {
  entiteId: string;
}

export default function DossierAuditTrail({ entiteId }: DossierAuditTrailProps) {
  const [events, setEvents] = useState<DossierEvenementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    adminApi.listEvenements(entiteId, { limit: 200 })
      .then(setEvents)
      .catch(() => setError("Impossible de charger l'historique."))
      .finally(() => setLoading(false));
  }, [entiteId]);

  if (loading) return null;
  if (events.length === 0) return null;

  return (
    <details className="card mb-4">
      <summary className="cursor-pointer font-bold text-lg flex items-center gap-2">
        <History className="w-5 h-5 text-gray-700" />
        Audit trail du dossier
        <span className="text-xs font-normal text-gray-500 ml-2">
          ({events.length} évènement{events.length > 1 ? 's' : ''})
        </span>
        <ChevronDown className="w-4 h-4 ml-auto" />
      </summary>

      <div className="mt-4">
        {error && <div className="alert alert-danger text-xs">{error}</div>}
        <ul className="space-y-2 max-h-96 overflow-y-auto">
          {events.map((e) => {
            const v = TYPE_VISUAL[e.evenement_type] ?? defaultVisual(e.evenement_type);
            const Icon = v.icon;
            const desc = describePayload(e.evenement_type, e.payload as Record<string, unknown>);
            return (
              <li key={e.id} className="flex items-start gap-2 text-sm border-b border-gray-100 pb-2 last:border-0">
                <Icon className={`w-4 h-4 ${v.color} flex-shrink-0 mt-0.5`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{v.label}</span>
                    <span className="text-[10px] text-gray-400">
                      par {e.acteur_nom}
                      {e.acteur_role && (
                        <span className="text-gray-300 ml-1">({e.acteur_role})</span>
                      )}
                      {' · '}
                      {e.createdAt ? new Date(e.createdAt).toLocaleString('fr-FR') : '-'}
                    </span>
                  </div>
                  {desc && <p className="text-xs text-gray-600 mt-0.5">{desc}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}
