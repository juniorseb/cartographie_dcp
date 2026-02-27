import { Link } from 'react-router-dom';
import { FileText, FolderOpen, MessageSquare, AlertTriangle } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as entrepriseApi from '@/api/entreprise.api';
import StepperWorkflow from '@/components/entreprise/StepperWorkflow';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import StatusBadge from '@/components/common/StatusBadge';
import { ROUTES } from '@/utils/constants';

export default function DashboardPage() {
  const { data: dashboard, isLoading, error, refetch } = useApi(
    () => entrepriseApi.getDashboard(),
    []
  );

  if (isLoading) return <Loading fullPage text="Chargement du dashboard..." />;
  if (error) return <ErrorDisplay message={error} onRetry={refetch} />;
  if (!dashboard) return null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Bienvenue */}
      <div className="card card-orange mb-6">
        <h1 className="text-2xl mb-1">Bienvenue, {dashboard.compte.denomination}</h1>
        <p className="text-sm text-gray-500">
          N° CC : {dashboard.compte.numero_cc} — {dashboard.compte.email}
        </p>
      </div>

      {/* Stepper 3 étapes */}
      <div className="card mb-6">
        <h3 className="text-lg font-bold mb-2">Votre parcours de conformité</h3>
        <StepperWorkflow steps={dashboard.steps} />
      </div>

      {/* Statut actuel */}
      {dashboard.statut_conformite && (
        <div className="card mb-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-gray-600">Statut de conformité :</span>{' '}
              <StatusBadge statut={dashboard.statut_conformite} />
            </div>
            {dashboard.score_conformite != null && (
              <div className="text-right">
                <span className="text-sm font-semibold text-gray-600">Score :</span>
                <div className="progress w-32 mt-1">
                  <div
                    className="progress-bar"
                    style={{ width: `${dashboard.score_conformite}%` }}
                  >
                    {dashboard.score_conformite}%
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feedbacks non lus */}
      {dashboard.feedbacks_non_lus > 0 && (
        <div className="alert alert-warning mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>
            Vous avez <strong>{dashboard.feedbacks_non_lus}</strong> feedback{dashboard.feedbacks_non_lus > 1 ? 's' : ''} non lu{dashboard.feedbacks_non_lus > 1 ? 's' : ''}.
          </span>
          <Link to={ROUTES.ENTREPRISE_FEEDBACKS} className="text-[var(--artci-orange)] font-semibold hover:underline ml-auto">
            Voir
          </Link>
        </div>
      )}

      {/* Actions rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {!dashboard.has_demande && (
          <Link to={ROUTES.ENTREPRISE_DEMANDE} className="card hover:shadow-lg transition-shadow no-underline">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-[var(--artci-orange)]" />
              <div>
                <p className="font-bold text-sm text-[var(--artci-black)]">Nouvelle Demande</p>
                <p className="text-xs text-gray-500">Remplir le formulaire</p>
              </div>
            </div>
          </Link>
        )}

        {dashboard.has_demande && dashboard.can_edit && (
          <Link to={`/entreprise/demande/${dashboard.entite_id}`} className="card hover:shadow-lg transition-shadow no-underline">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-[var(--artci-orange)]" />
              <div>
                <p className="font-bold text-sm text-[var(--artci-black)]">Modifier ma Demande</p>
                <p className="text-xs text-gray-500">Reprendre le brouillon</p>
              </div>
            </div>
          </Link>
        )}

        <Link to={ROUTES.ENTREPRISE_DOSSIER} className="card hover:shadow-lg transition-shadow no-underline">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-8 h-8 text-[var(--artci-green)]" />
            <div>
              <p className="font-bold text-sm text-[var(--artci-black)]">Mon Dossier</p>
              <p className="text-xs text-gray-500">Voir mon dossier complet</p>
            </div>
          </div>
        </Link>

        <Link to={ROUTES.ENTREPRISE_FEEDBACKS} className="card hover:shadow-lg transition-shadow no-underline">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-[var(--status-encours)]" />
            <div>
              <p className="font-bold text-sm text-[var(--artci-black)]">Feedbacks</p>
              <p className="text-xs text-gray-500">Retours de l'ARTCI</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
