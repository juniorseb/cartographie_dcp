import { Link } from 'react-router-dom';
import { FileText, FolderOpen, Bell, AlertTriangle, Clock, CheckCircle, Lock } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as entrepriseApi from '@/api/entreprise.api';
import StepperWorkflow from '@/components/entreprise/StepperWorkflow';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { ROUTES } from '@/utils/constants';

// Statuts pendant lesquels le dossier est en cours d'examen ARTCI
const STATUTS_EN_VERIFICATION = ['soumis', 'en_verification', 'en_attente_complements'];
const STATUTS_TERMINES = ['conforme', 'conforme_sous_reserve', 'valide', 'publie'];

export default function DashboardPage() {
  const { data: dashboard, isLoading, error, refetch } = useApi(
    () => entrepriseApi.getDashboard(),
    []
  );

  if (isLoading) return <Loading fullPage text="Chargement du tableau de bord..." />;
  if (error) return <ErrorDisplay message={error} onRetry={refetch} />;
  if (!dashboard) return null;

  const statut = dashboard.statut_workflow ?? '';
  const enVerification = STATUTS_EN_VERIFICATION.includes(statut);
  const termine = STATUTS_TERMINES.includes(statut);
  const enregistrementDesactive = enVerification || termine;

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

      {/* Message si dossier en cours de vérification */}
      {enVerification && (
        <div className="alert alert-info mb-6 flex items-start gap-3">
          <Clock className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Votre dossier est en cours de vérification par les équipes de l'ARTCI.</strong>
            <p className="text-sm mt-1">
              Vous serez notifié(e) dès qu'une réponse sera disponible.
              Pendant cette période, votre formulaire est en lecture seule.
            </p>
          </div>
        </div>
      )}

      {/* Notifications non lues */}
      {dashboard.feedbacks_non_lus > 0 && (
        <div className="alert alert-warning mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>
            Vous avez <strong>{dashboard.feedbacks_non_lus}</strong> notification{dashboard.feedbacks_non_lus > 1 ? 's' : ''} non lue{dashboard.feedbacks_non_lus > 1 ? 's' : ''}.
          </span>
          <Link to={ROUTES.ENTREPRISE_NOTIFICATIONS} className="text-[var(--artci-orange)] font-semibold hover:underline ml-auto">
            Voir
          </Link>
        </div>
      )}

      {/* Actions rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {!dashboard.has_demande && (
          <Link to={ROUTES.ENTREPRISE_ENREGISTREMENT} className="card hover:shadow-lg transition-shadow no-underline">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-[var(--artci-orange)]" />
              <div>
                <p className="font-bold text-sm text-[var(--artci-black)]">Nouvel Enregistrement</p>
                <p className="text-xs text-gray-500">Remplir le formulaire</p>
              </div>
            </div>
          </Link>
        )}

        {dashboard.has_demande && dashboard.can_edit && (
          <Link to={ROUTES.ENTREPRISE_ENREGISTREMENT} className="card hover:shadow-lg transition-shadow no-underline">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-[var(--artci-orange)]" />
              <div>
                <p className="font-bold text-sm text-[var(--artci-black)]">Modifier mon Enregistrement</p>
                <p className="text-xs text-gray-500">Reprendre le brouillon</p>
              </div>
            </div>
          </Link>
        )}

        {dashboard.has_demande && enregistrementDesactive && (
          <div className="card opacity-60">
            <div className="flex items-center gap-3">
              {termine ? (
                <CheckCircle className="w-8 h-8 text-[var(--artci-green)]" />
              ) : (
                <Lock className="w-8 h-8 text-gray-400" />
              )}
              <div>
                <p className="font-bold text-sm text-[var(--artci-black)]">Mon Enregistrement</p>
                <p className="text-xs text-gray-500">
                  {termine ? 'Dossier traité' : 'Verrouillé pendant la vérification'}
                </p>
              </div>
            </div>
          </div>
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

        <Link to={ROUTES.ENTREPRISE_NOTIFICATIONS} className="card hover:shadow-lg transition-shadow no-underline">
          <div className="flex items-center gap-3">
            <Bell className="w-8 h-8 text-[var(--status-encours)]" />
            <div>
              <p className="font-bold text-sm text-[var(--artci-black)]">Notifications</p>
              <p className="text-xs text-gray-500">Retours de l'ARTCI</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
