/**
 * Page : echeances des feedbacks de verification.
 * Vue dediee Admin/Super Admin pour suivre les delais de fourniture demandes
 * aux entreprises et detecter les retards.
 */
import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, Calendar, Clock, MessageSquare, Eye, CheckCircle2,
} from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as adminApi from '@/api/admin.api';
import Pagination from '@/components/common/Pagination';
import EmptyState from '@/components/common/EmptyState';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { ITEMS_PER_PAGE } from '@/utils/constants';
import type { StatutEcheanceFeedback } from '@/types/admin';

const FILTRES: { key: StatutEcheanceFeedback | 'all'; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'overdue', label: 'En retard', icon: AlertTriangle, color: 'text-red-600' },
  { key: 'today', label: "Aujourd'hui", icon: Clock, color: 'text-orange-600' },
  { key: 'upcoming', label: 'À venir', icon: Calendar, color: 'text-blue-600' },
  { key: 'with_deadline', label: 'Avec échéance', icon: Calendar, color: 'text-gray-700' },
  { key: 'no_deadline', label: 'Sans échéance', icon: MessageSquare, color: 'text-gray-500' },
  { key: 'all', label: 'Tous', icon: MessageSquare, color: 'text-gray-700' },
];

function classerEcheance(delai?: string): {
  label: string;
  className: string;
  icon: React.ElementType;
} {
  if (!delai) return { label: 'Sans échéance', className: 'bg-gray-100 text-gray-600', icon: MessageSquare };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(delai);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) {
    return {
      label: `En retard de ${Math.abs(diff)} j`,
      className: 'bg-red-100 text-red-800 border border-red-200',
      icon: AlertTriangle,
    };
  }
  if (diff === 0) return { label: "Aujourd'hui", className: 'bg-orange-100 text-orange-800 border border-orange-200', icon: Clock };
  if (diff <= 7) return { label: `Dans ${diff} j`, className: 'bg-yellow-100 text-yellow-800 border border-yellow-200', icon: Clock };
  return { label: `Dans ${diff} j`, className: 'bg-blue-50 text-blue-800 border border-blue-200', icon: Calendar };
}

export default function EcheancesFeedbacksPage() {
  const [filter, setFilter] = useState<StatutEcheanceFeedback | 'all'>('overdue');
  const [page, setPage] = useState(1);

  const fetcher = useCallback(() => adminApi.listFeedbacks({
    page,
    per_page: ITEMS_PER_PAGE,
    statut_echeance: filter === 'all' ? undefined : filter,
  }), [filter, page]);

  const { data, isLoading, error, refetch } = useApi(fetcher, [filter, page]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl mb-1 flex items-center gap-3">
          <AlertTriangle className="w-7 h-7 text-orange-500" />
          Échéances des feedbacks
        </h1>
        <p className="text-sm text-gray-600">
          Suivi des délais de fourniture demandés aux entreprises lors des feedbacks de vérification.
        </p>
      </div>

      {/* Filtres en pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTRES.map((f) => {
          const active = filter === f.key;
          const Icon = f.icon;
          return (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? 'bg-[var(--brand-secondary)] text-white border-[var(--brand-secondary)]'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : f.color}`} />
              {f.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <Loading fullPage text="Chargement des échéances..." />
      ) : error ? (
        <ErrorDisplay message={error} onRetry={refetch} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="Aucune échéance dans cette catégorie"
          description="Aucun feedback ne correspond au filtre sélectionné."
          icon={CheckCircle2}
        />
      ) : (
        <>
          <div className="table-container overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th>Entité</th>
                  <th>Agent</th>
                  <th>Date feedback</th>
                  <th>Éléments manquants</th>
                  <th>Délai fixé</th>
                  <th>Échéance</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((fb) => {
                  const verdict = classerEcheance(fb.delai_fourniture);
                  const VerdictIcon = verdict.icon;
                  const nbElems = fb.elements_manquants?.length ?? 0;
                  return (
                    <tr key={fb.id}>
                      <td className="font-semibold text-sm">
                        {fb.entite_denomination ?? fb.entite_id}
                      </td>
                      <td className="text-sm">
                        {fb.agent
                          ? `${fb.agent.prenom ?? ''} ${fb.agent.nom ?? ''}`.trim() || fb.agent.email
                          : '-'}
                      </td>
                      <td className="text-xs text-gray-600">
                        {new Date(fb.date_feedback).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="text-xs">
                        {nbElems > 0 ? (
                          <span className="badge badge-encours">{nbElems} élément(s)</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="text-xs">
                        {fb.delai_fourniture
                          ? new Date(fb.delai_fourniture).toLocaleDateString('fr-FR')
                          : <span className="text-gray-400">Non défini</span>}
                      </td>
                      <td>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${verdict.className}`}>
                          <VerdictIcon className="w-3 h-3" />
                          {verdict.label}
                        </span>
                      </td>
                      <td>
                        <Link
                          to={`/admin/entites/${fb.entite_id}`}
                          className="text-[var(--brand-secondary)] hover:underline flex items-center justify-end gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="text-sm">Voir</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            page={data.page}
            totalPages={data.pages}
            hasNext={data.has_next}
            hasPrev={data.has_prev}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
