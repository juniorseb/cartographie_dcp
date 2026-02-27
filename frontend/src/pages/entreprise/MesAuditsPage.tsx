import { ClipboardCheck, Clock, Info, AlertCircle } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as entrepriseApi from '@/api/entreprise.api';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import EmptyState from '@/components/common/EmptyState';
import { formatDate } from '@/utils/format';

export default function MesAuditsPage() {
  const { data: feedbacks, isLoading, error, refetch } = useApi(
    () => entrepriseApi.getFeedbacks(),
    []
  );

  if (isLoading) return <Loading fullPage text="Chargement des vérifications..." />;
  if (error) return <ErrorDisplay message={error} onRetry={refetch} />;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl mb-6 flex items-center gap-3">
        <ClipboardCheck className="w-7 h-7 text-[var(--artci-orange)]" />
        Historique des Vérifications
      </h1>

      <div className="card card-orange mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[var(--artci-orange)] flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm mb-1">Suivi de votre dossier</p>
            <p className="text-sm text-gray-600">
              Votre dossier est en cours de traitement par les agents ARTCI. Vous retrouverez
              ci-dessous l'historique des vérifications effectuées sur votre entité ainsi que
              les éventuelles demandes de compléments.
            </p>
          </div>
        </div>
      </div>

      {!feedbacks || feedbacks.length === 0 ? (
        <EmptyState
          title="Aucune vérification enregistrée"
          description="Aucune vérification n'a encore été effectuée sur votre dossier. Vous serez notifié dès qu'un agent ARTCI aura examiné votre demande."
          icon={ClipboardCheck}
        />
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Commentaires</th>
                <th>Éléments manquants</th>
                <th>Délai fourniture</th>
              </tr>
            </thead>
            <tbody>
              {feedbacks.map((fb) => (
                <tr key={fb.id}>
                  <td className="text-sm whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {formatDate(fb.createdAt)}
                    </span>
                  </td>
                  <td className="text-sm text-gray-700">
                    {fb.message || '-'}
                  </td>
                  <td className="text-sm">
                    {fb.elements_manquants && fb.elements_manquants.length > 0 ? (
                      <ul className="list-disc list-inside space-y-1">
                        {fb.elements_manquants.map((el: string, i: number) => (
                          <li key={i} className="text-gray-600">
                            <AlertCircle className="w-3 h-3 inline mr-1 text-orange-400" />
                            {el}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="text-sm text-gray-700">
                    {fb.delai_fourniture ? (
                      <span className="badge badge-encours">{fb.delai_fourniture}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
