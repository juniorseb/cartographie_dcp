import { Link } from 'react-router-dom';
import { FileText, FolderOpen, Bell, AlertTriangle, Clock, CheckCircle, Lock, ArrowRight, ExternalLink, ShieldCheck } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as entrepriseApi from '@/api/entreprise.api';
import StepperWorkflow from '@/components/entreprise/StepperWorkflow';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { ROUTES } from '@/utils/constants';

// Statuts pendant lesquels le dossier est en cours d'examen ARTCI
const STATUTS_EN_VERIFICATION = ['soumis', 'en_verification', 'en_attente_complements'];
const STATUTS_TERMINES = ['conforme_sous_reserve', 'valide', 'publie'];

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
    <div className="max-w-5xl mx-auto">
      {/* Bienvenue */}
      <section className="relative mb-6 overflow-hidden rounded-[var(--radius-card)] bg-[var(--brand-dark)] p-6 md:p-8 text-white shadow-card">
        <div aria-hidden className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[var(--brand-primary)] opacity-25 blur-3xl" />
        <div aria-hidden className="absolute right-32 -bottom-28 h-56 w-56 rounded-full bg-[var(--brand-secondary)] opacity-20 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--brand-primary)]">Espace organisme</p>
            <h1 className="mt-1 text-2xl md:text-[28px] text-white">Bienvenue, {dashboard.compte.denomination}</h1>
            <p className="mt-1 text-sm text-white/70 break-words">
              N° CC : {dashboard.compte.numero_cc} · {dashboard.compte.email}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 self-start rounded-full bg-white/10 border border-white/15 px-3.5 py-1.5 text-sm font-semibold md:self-center">
            {termine ? (
              <><CheckCircle className="w-4 h-4 text-[#4ADE80]" /> Dossier traité</>
            ) : enVerification ? (
              <><Clock className="w-4 h-4 text-[var(--brand-primary)]" /> En cours de vérification</>
            ) : dashboard.has_demande ? (
              <><FileText className="w-4 h-4 text-[var(--brand-primary)]" /> Brouillon en cours</>
            ) : (
              <><FileText className="w-4 h-4 text-[var(--brand-primary)]" /> Enregistrement à commencer</>
            )}
          </span>
        </div>
      </section>

      {/* Stepper 3 étapes */}
      <div className="card mb-6">
        <h2 className="text-lg mb-1">Votre parcours d'enregistrement</h2>
        <p className="text-sm text-[var(--brand-muted)]">Trois étapes pour figurer sur la cartographie nationale.</p>
        <StepperWorkflow steps={dashboard.steps} />
      </div>

      {/* Message si dossier en cours de vérification */}
      {enVerification && (
        <div className="alert alert-info mb-6 flex items-start gap-3">
          <Clock className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Votre enregistrement est en cours de vérification par les équipes de l'ARTCI.</strong>
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
          <Link to={ROUTES.ENTREPRISE_NOTIFICATIONS} className="text-[var(--brand-primary)] font-semibold hover:underline ml-auto">
            Voir
          </Link>
        </div>
      )}

      {/* Actions rapides */}
      <h2 className="text-lg mb-3">Accès rapides</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {!dashboard.has_demande && (
          <Link to={ROUTES.ENTREPRISE_ENREGISTREMENT} className="card card-lift group no-underline">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: 'color-mix(in srgb, var(--brand-primary) 12%, #fff)', color: 'var(--brand-primary)' }}><FileText className="w-6 h-6" /></span>
              <div>
                <p className="font-display font-bold text-[15px] text-[var(--brand-dark)]">Nouvel Enregistrement</p>
                <p className="text-xs text-[var(--brand-muted)]">Remplir le formulaire</p>
              </div>
              <ArrowRight className="ml-auto w-5 h-5 text-gray-300 transition-transform group-hover:translate-x-1 group-hover:text-[var(--brand-primary)]" />
            </div>
          </Link>
        )}

        {dashboard.has_demande && dashboard.can_edit && (
          <Link to={ROUTES.ENTREPRISE_ENREGISTREMENT} className="card card-lift group no-underline">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: 'color-mix(in srgb, var(--brand-primary) 12%, #fff)', color: 'var(--brand-primary)' }}><FileText className="w-6 h-6" /></span>
              <div>
                <p className="font-display font-bold text-[15px] text-[var(--brand-dark)]">Modifier mon Enregistrement</p>
                <p className="text-xs text-[var(--brand-muted)]">Reprendre le brouillon</p>
              </div>
              <ArrowRight className="ml-auto w-5 h-5 text-gray-300 transition-transform group-hover:translate-x-1 group-hover:text-[var(--brand-primary)]" />
            </div>
          </Link>
        )}

        {dashboard.has_demande && enregistrementDesactive && (
          <div className="card opacity-60">
            <div className="flex items-center gap-3">
              {termine ? (
                <CheckCircle className="w-8 h-8 text-[var(--brand-secondary)]" />
              ) : (
                <Lock className="w-8 h-8 text-gray-400" />
              )}
              <div>
                <p className="font-display font-bold text-[15px] text-[var(--brand-dark)]">Mon Enregistrement</p>
                <p className="text-xs text-[var(--brand-muted)]">
                  {termine ? 'Dossier traité' : 'Verrouillé pendant la vérification'}
                </p>
              </div>
            </div>
          </div>
        )}

        <Link to={ROUTES.ENTREPRISE_DOSSIER} className="card card-lift group no-underline">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: 'color-mix(in srgb, var(--brand-secondary) 12%, #fff)', color: 'var(--brand-secondary)' }}><FolderOpen className="w-6 h-6" /></span>
            <div>
              <p className="font-display font-bold text-[15px] text-[var(--brand-dark)]">Mon Dossier</p>
              <p className="text-xs text-[var(--brand-muted)]">Voir mon dossier complet</p>
            </div>
            <ArrowRight className="ml-auto w-5 h-5 text-gray-300 transition-transform group-hover:translate-x-1 group-hover:text-[var(--brand-primary)]" />
          </div>
        </Link>

        <Link to={ROUTES.ENTREPRISE_NOTIFICATIONS} className="card card-lift group no-underline">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: 'color-mix(in srgb, var(--status-encours) 12%, #fff)', color: 'var(--status-encours)' }}><Bell className="w-6 h-6" /></span>
            <div>
              <p className="font-display font-bold text-[15px] text-[var(--brand-dark)]">Notifications</p>
              <p className="text-xs text-[var(--brand-muted)]">Retours de l'ARTCI</p>
            </div>
            <ArrowRight className="ml-auto w-5 h-5 text-gray-300 transition-transform group-hover:translate-x-1 group-hover:text-[var(--brand-primary)]" />
          </div>
        </Link>
      </div>

      {/* Formalites sur CERTINUM */}
      <a
        href={ROUTES.CERTINUM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 flex flex-col gap-4 rounded-[var(--radius-card)] border border-[#BFE8D2] bg-[var(--brand-secondary-soft)] p-5 no-underline transition-shadow hover:shadow-card sm:flex-row sm:items-center"
      >
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--brand-secondary)] text-white">
          <ShieldCheck className="w-6 h-6" />
        </span>
        <div className="flex-1">
          <p className="font-display font-bold text-[var(--brand-dark)]">Déclarations et demandes d'autorisation</p>
          <p className="text-sm text-[#334155]">Les formalités préalables se font sur la plateforme officielle CERTINUM APDP.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 font-display text-sm font-bold text-[var(--brand-secondary-hover)]">
          Accéder à CERTINUM <ExternalLink className="w-4 h-4" />
        </span>
      </a>
    </div>
  );
}
