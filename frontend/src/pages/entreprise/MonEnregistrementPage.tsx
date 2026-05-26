/**
 * Page "Mon enregistrement" - QUESTIONNAIRE DE RECENSEMENT ET D'EVALUATION
 * DE LA CONFORMITE A LA LOI N°2013-450.
 *
 * Toutes les questions, options et libellés correspondent EXACTEMENT au
 * document Word officiel "QUESTIONNAIRE DE RECENSEMENT DCP.docx".
 *
 * MODE DUAL :
 * - mode='entreprise' (defaut) : utilise via /entreprise/mon-enregistrement
 *   par le Demandeur ou Representant legal. Soumission a l'ARTCI.
 * - mode='admin' : utilise via /admin/entites/nouveau ou /admin/entites/:id
 *   par un agent ARTCI (saisie ARTCI / edition). Pas de bouton "soumettre"
 *   (l'agent ARTCI ne soumet pas a soi-meme), juste "enregistrer".
 *   La cible est l'entiteId fourni (ou nouvelle creation si absent).
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Send, AlertTriangle, Lock, ChevronLeft, ChevronRight, CheckCircle2, ListChecks, ShieldAlert, RefreshCw } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import * as entrepriseApi from '@/api/entreprise.api';
import * as adminApi from '@/api/admin.api';
import Loading from '@/components/common/Loading';
import {
  FormSection, RadioGroup, CheckboxGroup, TextField, TextArea, SelectField,
} from '@/components/entreprise/dcp-form/FormFields';
import CategorieDonneesRow from '@/components/entreprise/dcp-form/CategorieDonneesRow';
import FormaliteCalculee, { determinerFormalite } from '@/components/entreprise/dcp-form/FormaliteCalculee';
import PaysSelect from '@/components/entreprise/dcp-form/PaysSelect';
import LocalisationPicker from '@/components/entreprise/dcp-form/LocalisationPicker';
import { useFormProgress } from '@/components/entreprise/dcp-form/useFormProgress';
import CommentairesARTCI from '@/components/entreprise/CommentairesARTCI';
import CommentairesAncres from '@/components/admin/CommentairesAncres';
import { CATEGORIES_DONNEES_CONFIG } from '@/components/entreprise/dcp-form/categories-donnees-config';
import { REGIONS_CI, communesForRegion, SECTEURS_ACTIVITE } from '@/components/entreprise/dcp-form/ci-localites';
import {
  emptyFormulaireDCP, type FormulaireDCP,
  type StadeDemarche,
  type RaisonNonFormalites,
  type CategoriePersonnes,
  type Finalite,
  type BaseLegale,
  type InfoCommuniquee,
  type CommentInformer,
  type ClauseObligatoire,
  type GarantieTransfert,
  type CategorieDonneesDetail,
  type ActiviteTraitementDCP,
  type MesureTechnique, type MesureOrganisationnelle,
} from '@/types/formulaire-dcp';

// Statuts pour lesquels le formulaire est en LECTURE SEULE (cote entreprise uniquement)
const STATUTS_LECTURE_SEULE = ['soumis', 'en_verification'];

// Definition des 6 etapes (5 parties du Word + 1 recapitulatif)
const STEPS = [
  { num: 1, key: 'identification', label: 'Identification' },
  { num: 2, key: 'cadre_juridique', label: 'Cadre juridique' },
  { num: 3, key: 'registre', label: 'Registre & traitements' },
  { num: 4, key: 'sous_traitance_transferts', label: 'Sous-traitance & transferts' },
  { num: 5, key: 'securite', label: 'Sécurité & formation' },
  { num: 6, key: 'recap', label: 'Récapitulatif' },
] as const;
type StepNum = 1 | 2 | 3 | 4 | 5 | 6;

/** Valide les champs obligatoires d'une etape. Retourne '' si OK. */
function validateStep(step: StepNum, form: FormulaireDCP): string {
  const id = form.identification ?? {};
  const cj = form.cadre_juridique ?? {};
  const reg = form.registre ?? {};
  const st = form.sous_traitance_transferts ?? {};
  const sec = form.securite ?? {};

  if (step === 1) {
    if (!id.statut_juridique) return 'Le statut juridique est obligatoire.';
    if (id.statut_juridique === 'pm_droit_prive' || id.statut_juridique === 'pm_droit_public') {
      const pm = id.personne_morale ?? {};
      if (!pm.denomination_officielle?.trim()) return 'La dénomination officielle est obligatoire.';
      if (!pm.raison_sociale?.trim()) return 'La raison sociale est obligatoire.';
      if (!pm.numero_cc?.trim()) return "Le N° CC de l'entité est obligatoire.";
      if (!pm.region) return 'La région est obligatoire.';
      if (!pm.commune) return 'La commune est obligatoire.';
      if (!pm.ville?.trim()) return 'La ville / localité est obligatoire.';
      if (!pm.adresse_siege?.trim()) return "L'adresse complète du siège est obligatoire.";
    }
    if (id.statut_juridique === 'personne_physique') {
      const pp = id.personne_physique ?? {};
      if (!pp.nom_prenom?.trim()) return 'Le nom et prénom sont obligatoires.';
      if (!pp.fonction?.trim()) return 'La fonction est obligatoire.';
      if (!pp.region) return 'La région est obligatoire.';
      if (!pp.commune) return 'La commune est obligatoire.';
      if (!pp.ville?.trim()) return 'La ville / localité est obligatoire.';
      if (!pp.adresse?.trim()) return "L'adresse complète est obligatoire.";
    }
    if (!id.secteurs_activite?.length) return "Sélectionnez au moins un secteur d'activité.";
    if (id.secteurs_activite.includes('Autre') && !id.secteur_autre?.trim()) {
      return 'Précisez le secteur « Autre ».';
    }
    if (!id.volume_donnees) return 'Le volume de données est obligatoire.';
    if (!id.responsable_legal?.nom_prenom?.trim()) return 'Le nom du Responsable légal est obligatoire.';
    if (!id.responsable_legal?.fonction?.trim()) return 'La fonction du Responsable légal est obligatoire.';
    if (!id.responsable_legal?.email?.trim()) return "L'email du Responsable légal est obligatoire.";
    if (!id.responsable_legal?.telephone?.trim()) return 'Le téléphone du Responsable légal est obligatoire.';
    if (typeof id.localisation?.latitude !== 'number' || typeof id.localisation?.longitude !== 'number') {
      return 'La localisation géographique (pointage sur carte) est obligatoire.';
    }
    return '';
  }

  if (step === 2) {
    if (!cj.connaissance_loi_2013) return 'Question Loi 2013-450 obligatoire.';
    if (!cj.connaissance_obligations) return 'Question Obligations légales obligatoire.';
    if (!cj.connaissance_artci) return "Question rôle ARTCI obligatoire.";
    if (!cj.dpo_habilite) return "Question DPO habilité obligatoire.";
    if (cj.dpo_habilite === 'oui') {
      if (!cj.dpo_type) return 'Précisez si le DPO est interne ou externe.';
      if (cj.dpo_type === 'externe' && !cj.dpo_externe_type) {
        return 'Précisez si le DPO externe est une personne physique ou morale.';
      }
      if (!cj.dpo_courrier_habilitation_uploaded) {
        return "Le courrier d'habilitation du DPO est obligatoire.";
      }
    }
    return '';
  }

  if (step === 3) {
    // Questions deplacees depuis le cadre juridique
    if (!cj.distinction_decl_aut) return 'Question distinction Déclaration/Autorisation obligatoire.';
    if (!reg.activites_traitement?.length) return 'Cochez au moins une activité de traitement.';
    if (!reg.registre_tenu) return 'Question registre des traitements obligatoire.';
    if (!reg.categories_personnes?.length) return 'Cochez au moins une catégorie de personnes.';
    if (!reg.categories_donnees || Object.keys(reg.categories_donnees).length === 0) {
      return 'Au moins une catégorie de données doit être renseignée.';
    }
    if (!st.suppression_anonymisation) return "Question suppression/anonymisation obligatoire.";
    if (!reg.finalites?.length) return 'Cochez au moins une finalité de traitement.';
    if (!cj.formalites_effectuees) return 'Question formalités effectuées obligatoire.';
    if (!reg.bases_legales?.length) return 'Cochez au moins une base légale.';
    if (!reg.mode_traitement) return 'Question mode de traitement obligatoire.';
    if (!reg.info_personnes_collecte) return 'Question information des personnes obligatoire.';
    if (!reg.reutilisation_donnees) return 'Question réutilisation des données obligatoire.';
    return '';
  }

  if (step === 4) {
    if (!st.recours_sous_traitants) return 'Question recours à sous-traitants obligatoire.';
    if (!st.transfert_hors_cedeao) return 'Question transfert hors CEDEAO obligatoire.';
    if (st.transfert_hors_cedeao === 'oui' && (!st.pays_transferts || st.pays_transferts.length === 0)) {
      return 'Sélectionnez au moins un pays de destination du transfert.';
    }
    return '';
  }

  if (step === 5) {
    if (!sec.politique_securite) return 'Question charte de protection des données obligatoire.';
    if (sec.politique_securite === 'oui_formalisee' && !sec.charte_uploaded) {
      return 'Upload de la charte obligatoire.';
    }
    if (!sec.mesures_techniques_list?.length) return 'Cochez au moins une mesure technique.';
    if (!sec.mesures_organisationnelles_list?.length) return 'Cochez au moins une mesure organisationnelle.';
    if (!sec.violation_12mois) return 'Question violations 12 mois obligatoire.';
    if (!sec.registre_violations) return 'Question registre des violations obligatoire.';
    if (!sec.procedures_violation) return 'Question procédures de violation obligatoire.';
    if (!sec.personnel_sensibilise) return 'Question sensibilisation personnel obligatoire.';
    if (!st.protection_supports) return 'Question protection des supports obligatoire.';
    return '';
  }

  return '';
}

interface MonEnregistrementPageProps {
  /** Mode d'utilisation. Defaut: 'entreprise'.
   *
   * - 'entreprise' : utilisateur entreprise remplit/modifie son dossier.
   * - 'admin'      : agent ARTCI saisit ou edite (saisie ARTCI).
   * - 'view'       : admin/editeur consulte en LECTURE SEULE (depuis l'entite
   *   ou Mon Panier). Memes sections, meme stepper, mais aucun input editable.
   * - 'treat'      : admin/editeur traite le dossier — lecture seule PLUS le
   *   panneau commentaires ARTCI affiche sous chaque section. Le scoring,
   *   la validation et le retour a l'entreprise sont geres par les wrappers
   *   admin (TraiterDossierPage, etc.) qui affichent ces actions a cote.
   */
  mode?: 'entreprise' | 'admin' | 'view' | 'treat';
  /** ID de l'entite a charger (mode admin/view/treat). Si absent, on lit
   * useParams().id. Pratique pour les wrappers ou le param de route porte
   * un autre nom (ex: TraiterDossierPage utilise `:entiteId`). */
  entiteId?: string;
}

export default function MonEnregistrementPage({ mode = 'entreprise', entiteId: entiteIdProp }: MonEnregistrementPageProps) {
  const isAdminMode = mode === 'admin';
  const isViewMode = mode === 'view' || mode === 'treat';
  const showComments = mode === 'treat';
  const { compte } = useAuth();
  const params = useParams<{ id?: string }>();
  const navigate = useNavigate();
  // L'entite cible vient en priorite de la prop (wrapper admin), sinon du
  // param d'URL `:id` (route /admin/entites/:id).
  const [adminEntiteId, setAdminEntiteId] = useState<string | null>(entiteIdProp ?? params.id ?? null);

  const [form, setForm] = useState<FormulaireDCP>(emptyFormulaireDCP());
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [statutWorkflow, setStatutWorkflow] = useState<string | null>(null);
  // Version courante du formulaire (verrouillage optimiste manœuvre B)
  const [formVersion, setFormVersion] = useState<number>(0);
  // Etape courante du stepper (1..6)
  const [currentStep, setCurrentStep] = useState<StepNum>(1);

  // Loader cote entreprise (uniquement en mode 'entreprise')
  const useEntrepriseLoader = mode === 'entreprise';
  // Loader cote admin (mode 'admin' / 'view' / 'treat') : on charge l'entite
  // par son ID via l'endpoint admin (qui retourne le formulaire DCP complet).
  const useAdminLoader = (mode === 'admin' || isViewMode) && Boolean(adminEntiteId);

  const { data: entrepriseData, isLoading: entrepriseLoading } = useApi(
    () => useEntrepriseLoader ? entrepriseApi.getFormulaireDCP() : Promise.resolve(null),
    [useEntrepriseLoader],
  );
  const { data: dossier } = useApi(
    () => useEntrepriseLoader ? entrepriseApi.getMonDossier() : Promise.resolve(null),
    [useEntrepriseLoader],
  );

  const { data: adminData, isLoading: adminLoading } = useApi(
    () => useAdminLoader
      ? adminApi.adminGetFormulaireDCP(adminEntiteId!)
      : Promise.resolve(null),
    [useAdminLoader, adminEntiteId],
  );

  const isLoading = entrepriseLoading || adminLoading;

  useEffect(() => {
    // En modes admin / view / treat on lit l'entite via l'endpoint admin.
    // En mode entreprise on lit le dossier propre.
    const data = useAdminLoader ? adminData : entrepriseData;
    const hasReponses = data?.reponses && Object.keys(data.reponses).length > 0;
    if (hasReponses) {
      setForm({ ...emptyFormulaireDCP(), ...(data!.reponses as Partial<FormulaireDCP>) });
    } else if (!isAdminMode && compte) {
      // Preremplissage : nouveau dossier d'une entreprise deja inscrite.
      // On reprend les infos connues du compte (denomination, N° CC, localisation...).
      setForm((prev) => ({
        ...prev,
        identification: {
          ...prev.identification,
          statut_juridique: prev.identification.statut_juridique ?? 'pm_droit_prive',
          personne_morale: {
            ...prev.identification.personne_morale,
            denomination_officielle: prev.identification.personne_morale?.denomination_officielle || compte.denomination || '',
            raison_sociale: prev.identification.personne_morale?.raison_sociale || compte.denomination || '',
            numero_cc: prev.identification.personne_morale?.numero_cc || compte.numero_cc || '',
            adresse_siege: prev.identification.personne_morale?.adresse_siege || compte.adresse || '',
            ville: prev.identification.personne_morale?.ville || compte.ville || '',
            region: prev.identification.personne_morale?.region || compte.region || '',
          },
        },
      }));
    }
    if (data?.version !== undefined) {
      setFormVersion(data.version);
    }
  }, [adminData, entrepriseData, isAdminMode, compte]);

  useEffect(() => {
    if (dossier?.workflow?.statut) {
      setStatutWorkflow(dossier.workflow.statut);
    }
  }, [dossier]);

  // Lecture seule :
  // - mode 'view' / 'treat' : TOUJOURS lecture seule (admin/editeur consulte)
  // - mode 'entreprise' : lecture seule si dossier soumis / en verification
  // - mode 'admin' (saisie ARTCI) : jamais lecture seule
  const isReadOnly = isViewMode
    || (!isAdminMode
        && statutWorkflow !== null
        && STATUTS_LECTURE_SEULE.includes(statutWorkflow));

  const updatePart = useCallback(<K extends keyof FormulaireDCP>(key: K, patch: Partial<FormulaireDCP[K]>) => {
    setForm((prev) => ({ ...prev, [key]: { ...(prev[key] as object), ...patch } } as FormulaireDCP));
  }, []);

  const updateCategorieDonnees = useCallback((key: string, value: CategorieDonneesDetail) => {
    setForm((prev) => ({
      ...prev,
      registre: {
        ...prev.registre,
        categories_donnees: {
          ...(prev.registre.categories_donnees ?? {}),
          [key]: value,
        },
      },
    }));
  }, []);

  function extractApiError(err: unknown, fallback: string): string {
    const e = err as { response?: { status?: number; data?: { message?: string; error?: string } } };
    return e?.response?.data?.message ?? e?.response?.data?.error ?? fallback;
  }

  async function handleSave() {
    setSaving(true); setError(''); setSuccess('');
    try {
      const reponses = form as unknown as Record<string, unknown>;
      if (isAdminMode) {
        if (adminEntiteId) {
          const res = await adminApi.adminSaveFormulaireDCP(adminEntiteId, reponses, formVersion);
          setFormVersion(res.version ?? formVersion + 1);
          setSuccess('Formulaire sauvegardé.');
        } else {
          // Premiere sauvegarde en mode admin saisie_artci : on cree l'entite
          const created = await adminApi.adminCreateSaisieArtci({ reponses });
          setAdminEntiteId(created.id);
          setFormVersion(created.version ?? 1);
          setSuccess(`Entité créée (N° CC ${created.numero_cc}). Continuez à compléter le formulaire.`);
          // Mettre a jour l'URL pour permettre la re-edition
          navigate(`/admin/entites/${created.id}/saisie`, { replace: true });
        }
      } else {
        const res = await entrepriseApi.saveFormulaireDCP(reponses, formVersion);
        setFormVersion(res.version ?? formVersion + 1);
        setSuccess('Brouillon sauvegardé.');
      }
    } catch (err) {
      setError(extractApiError(err, "Erreur lors de la sauvegarde."));
    } finally { setSaving(false); }
  }

  /** Sauvegarde silencieuse en arriere-plan (avant de passer a l'etape suivante). */
  async function saveDraftSilent(): Promise<void> {
    try {
      const reponses = form as unknown as Record<string, unknown>;
      if (isAdminMode) {
        if (adminEntiteId) {
          const res = await adminApi.adminSaveFormulaireDCP(adminEntiteId, reponses, formVersion);
          setFormVersion(res.version ?? formVersion + 1);
        } else {
          const created = await adminApi.adminCreateSaisieArtci({ reponses });
          setAdminEntiteId(created.id);
          setFormVersion(created.version ?? 1);
          navigate(`/admin/entites/${created.id}/saisie`, { replace: true });
        }
      } else {
        const res = await entrepriseApi.saveFormulaireDCP(reponses, formVersion);
        setFormVersion(res.version ?? formVersion + 1);
      }
    } catch {
      // silent : on n'interrompt pas le passage d'etape
    }
  }

  async function goNext() {
    setError(''); setSuccess('');
    // Validation des champs obligatoires de l'etape courante
    if (currentStep <= 5) {
      const err = validateStep(currentStep, form);
      if (err) {
        setError(err);
        // scroll en haut pour voir le message
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }
    // Sauvegarde brouillon en arriere-plan
    await saveDraftSilent();
    if (currentStep < 6) {
      setCurrentStep((currentStep + 1) as StepNum);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function goPrev() {
    setError(''); setSuccess('');
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as StepNum);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function handleSubmit() {
    // En mode admin, pas de soumission a soi-meme : on sauvegarde et on retourne au panier.
    if (isAdminMode) {
      await handleSave();
      return;
    }
    // Verifie toutes les etapes 1..5 avant soumission finale
    for (const step of [1, 2, 3, 4, 5] as StepNum[]) {
      const err = validateStep(step, form);
      if (err) {
        setError(`Étape ${step} incomplète : ${err}`);
        setCurrentStep(step);
        setShowSubmitConfirm(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }
    setSubmitting(true); setError(''); setSuccess(''); setShowSubmitConfirm(false);
    try {
      const saveRes = await entrepriseApi.saveFormulaireDCP(
        form as unknown as Record<string, unknown>,
        formVersion,
      );
      setFormVersion(saveRes.version ?? formVersion + 1);
      await entrepriseApi.soumettreFormulaireDCP();
      setSuccess('Dossier soumis à l\'ARTCI avec succès. Vous serez notifié(e) après traitement.');
      setStatutWorkflow('soumis');
    } catch (err) {
      // Le backend renvoie un message specifique si commentaires open non traites,
      // ou si conflit de version. On affiche le message tel quel.
      setError(extractApiError(err, "Erreur lors de la soumission."));
    } finally { setSubmitting(false); }
  }

  // Hooks AVANT tout early return (rules of hooks)
  const progress = useFormProgress(form);

  if (isLoading) return <Loading fullPage text="Chargement du formulaire..." />;

  const id = form.identification;
  const cj = form.cadre_juridique;
  const reg = form.registre;
  const st = form.sous_traitance_transferts;
  const sec = form.securite;

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--artci-orange)]">
          {isAdminMode
            ? (adminEntiteId ? "Édition d'une entité" : 'Nouveau recensement (saisie ARTCI)')
            : 'Mon enregistrement'}
        </h1>
      </div>

      {!isAdminMode && (
        <div className="alert alert-info mb-6 text-sm">
          Ce questionnaire a pour finalité d'établir un registre des entités procédant au traitement
          des données à caractère personnel et d'évaluer leur niveau de conformité.
          Conformément à l'article 45 de la loi N°2013-450, toute entrave à l'action de l'Autorité
          de protection des données est passible de sanctions pénales.
        </div>
      )}

      {isAdminMode && (
        <div className="alert alert-warning mb-6 text-sm flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Saisie ARTCI</strong> — Vous êtes en train de remplir le questionnaire pour
            le compte d'une entreprise. L'entité sera marquée <code>origine_saisie = saisie_artci</code>.
            {!adminEntiteId && (
              <span> La première sauvegarde créera l'entité dans la base.</span>
            )}
          </div>
        </div>
      )}

      {/* STEPPER : 6 etapes (Partie 1..5 + Recap) avec progression visuelle */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-700">
            Étape {currentStep} sur {STEPS.length}
          </span>
          <span className="text-xs text-gray-500">
            Progression globale : <strong className="text-[var(--artci-orange)]">{progress.percent}%</strong>
            <span className="ml-1">({progress.filled}/{progress.total} questions)</span>
          </span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
          {STEPS.map((s, idx) => {
            const isCurrent = currentStep === s.num;
            const isDone = currentStep > s.num;
            return (
              <div key={s.num} className="flex items-center flex-shrink-0">
                <button
                  type="button"
                  onClick={() => { setCurrentStep(s.num as StepNum); setError(''); setSuccess(''); }}
                  className={`flex flex-col items-center gap-1 px-2 py-1 rounded transition-colors ${
                    isCurrent ? 'bg-[var(--artci-orange)] text-white'
                    : isDone ? 'text-[var(--artci-green)] hover:bg-green-50'
                    : 'text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <span className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                    isCurrent ? 'bg-white text-[var(--artci-orange)]'
                    : isDone ? 'bg-[var(--artci-green)] text-white'
                    : 'bg-gray-200 text-gray-500'
                  }`}>
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                  </span>
                  <span className="text-[10px] font-semibold whitespace-nowrap hidden sm:block">{s.label}</span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div className={`h-0.5 w-4 sm:w-8 mx-1 ${isDone ? 'bg-[var(--artci-green)]' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>
        <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden mt-3">
          <div
            className="h-full bg-[var(--artci-orange)] transition-all duration-300"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      {error && <div className="alert alert-danger mb-4">{error}</div>}
      {success && <div className="alert alert-success mb-4">{success}</div>}

      {/* Commentaires ARTCI ancres (modele PR) - cote ENTREPRISE uniquement */}
      {mode === 'entreprise' && <CommentairesARTCI />}

      {/* Commentaires ancres - cote ADMIN/EDITEUR en mode 'treat'.
          En mode 'view' on n'affiche rien (consultation pure).
          En mode 'admin' (saisie ARTCI) non plus : c'est de la saisie initiale. */}
      {showComments && adminEntiteId && (
        <CommentairesAncres entiteId={adminEntiteId} />
      )}

      {/* Bandeau lecture seule — message different selon le contexte */}
      {isReadOnly && (
        <div className="alert alert-info mb-6 flex items-start gap-3">
          <Lock className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Formulaire en lecture seule.</strong>
            <p className="text-sm mt-1">
              {mode === 'view' && "Consultation du dossier soumis par l'entreprise."}
              {mode === 'treat' && "Vous traitez ce dossier. Ajoutez vos commentaires par section ci-dessus."}
              {mode === 'entreprise' && (
                <>
                  Votre enregistrement est en cours de vérification par l'ARTCI. Le formulaire sera
                  de nouveau modifiable après retour de l'ARTCI.
                </>
              )}
            </p>
          </div>
        </div>
      )}

      <div className={isReadOnly ? 'opacity-60 pointer-events-none' : ''}>

      {/* ============================ PARTIE 1 ============================ */}
      {currentStep === 1 && (
      <FormSection title="PARTIE 1 : IDENTIFICATION DE L'ENTITÉ">

        <RadioGroup
          legend="Statut juridique de l'entité :"
          options={[
            { value: 'pm_droit_prive', label: 'Personne morale de droit privé (Entreprise, Association)' },
            { value: 'pm_droit_public', label: 'Personne morale de droit public (Administration, Collectivité territoriale)' },
            { value: 'personne_physique', label: 'Personne physique (Entrepreneur individuel)' },
          ]}
          value={id.statut_juridique}
          onChange={(v) => updatePart('identification', { statut_juridique: v })}
          required
        />

        {(id.statut_juridique === 'pm_droit_prive' || id.statut_juridique === 'pm_droit_public') && (
          <fieldset className="border border-gray-200 p-4 mb-4">
            <legend className="text-xs font-bold text-gray-700 px-2">PERSONNE MORALE</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField label="Dénomination officielle" required
                value={id.personne_morale?.denomination_officielle}
                onChange={(v) => updatePart('identification', { personne_morale: { ...id.personne_morale, denomination_officielle: v } })} />
              <TextField label="Raison sociale" required
                value={id.personne_morale?.raison_sociale}
                onChange={(v) => updatePart('identification', { personne_morale: { ...id.personne_morale, raison_sociale: v } })} />
              <TextField label="N° CC" required
                value={id.personne_morale?.numero_cc}
                onChange={(v) => updatePart('identification', { personne_morale: { ...id.personne_morale, numero_cc: v } })} />
              <SelectField label="Région" required
                options={REGIONS_CI}
                value={id.personne_morale?.region}
                onChange={(v) => updatePart('identification', { personne_morale: { ...id.personne_morale, region: v, commune: '' } })} />
              <SelectField label="Commune" required
                options={communesForRegion(id.personne_morale?.region)}
                value={id.personne_morale?.commune}
                onChange={(v) => updatePart('identification', { personne_morale: { ...id.personne_morale, commune: v } })}
                placeholder={id.personne_morale?.region ? 'Sélectionnez…' : "Choisissez d'abord la région"} />
              <TextField label="Ville / Localité" required
                value={id.personne_morale?.ville}
                onChange={(v) => updatePart('identification', { personne_morale: { ...id.personne_morale, ville: v } })} />
            </div>
            <TextArea label="Adresse complète du siège" rows={2} required
              value={id.personne_morale?.adresse_siege}
              onChange={(v) => updatePart('identification', { personne_morale: { ...id.personne_morale, adresse_siege: v } })} />
          </fieldset>
        )}

        {id.statut_juridique === 'personne_physique' && (
          <fieldset className="border border-gray-200 p-4 mb-4">
            <legend className="text-xs font-bold text-gray-700 px-2">PERSONNE PHYSIQUE</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField label="Nom & prénom(s)" required
                value={id.personne_physique?.nom_prenom}
                onChange={(v) => updatePart('identification', { personne_physique: { ...id.personne_physique, nom_prenom: v } })} />
              <TextField label="Fonction" required
                value={id.personne_physique?.fonction}
                onChange={(v) => updatePart('identification', { personne_physique: { ...id.personne_physique, fonction: v } })} />
              <SelectField label="Région" required
                options={REGIONS_CI}
                value={id.personne_physique?.region}
                onChange={(v) => updatePart('identification', { personne_physique: { ...id.personne_physique, region: v, commune: '' } })} />
              <SelectField label="Commune" required
                options={communesForRegion(id.personne_physique?.region)}
                value={id.personne_physique?.commune}
                onChange={(v) => updatePart('identification', { personne_physique: { ...id.personne_physique, commune: v } })}
                placeholder={id.personne_physique?.region ? 'Sélectionnez…' : "Choisissez d'abord la région"} />
              <TextField label="Ville / Localité" required
                value={id.personne_physique?.ville}
                onChange={(v) => updatePart('identification', { personne_physique: { ...id.personne_physique, ville: v } })} />
            </div>
            <TextArea label="Adresse complète du siège" rows={2} required
              value={id.personne_physique?.adresse}
              onChange={(v) => updatePart('identification', { personne_physique: { ...id.personne_physique, adresse: v } })} />
          </fieldset>
        )}

        {/* Secteur(s) d'activite en multi-selection */}
        <CheckboxGroup
          legend="Secteur(s) d'activité (cochez tous ceux applicables) *"
          columns={2}
          options={SECTEURS_ACTIVITE.map((s) => ({ value: s, label: s }))}
          values={id.secteurs_activite ?? []}
          onChange={(v) => updatePart('identification', { secteurs_activite: v })}
        />
        {id.secteurs_activite?.includes('Autre') && (
          <TextField label="Préciser le secteur « Autre »" required
            value={id.secteur_autre}
            onChange={(v) => updatePart('identification', { secteur_autre: v })} />
        )}

        <RadioGroup
          legend="Volume approximatif de données personnelles traitées :"
          required
          options={[
            { value: 'moins_1000', label: 'Moins de 1 000 personnes concernées' },
            { value: '1000_10000', label: '1 000 à 10 000 personnes' },
            { value: '10000_100000', label: '10 000 à 100 000 personnes' },
            { value: 'plus_100000', label: 'Plus de 100 000 personnes' },
          ]}
          value={id.volume_donnees}
          onChange={(v) => updatePart('identification', { volume_donnees: v })}
        />

        {/* Pointage carte interactive (spec : remplacer la saisie texte de lat/lng) */}
        <LocalisationPicker
          value={id.localisation}
          onChange={(v) => updatePart('identification', { localisation: v })}
          disabled={isReadOnly}
        />

        <fieldset className="border border-gray-200 p-4">
          <legend className="text-xs font-bold text-gray-700 px-2">Responsable légal de l'organisation</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField label="Nom et prénom(s)" required
              value={id.responsable_legal?.nom_prenom}
              onChange={(v) => updatePart('identification', { responsable_legal: { ...id.responsable_legal, nom_prenom: v } })} />
            <TextField label="Fonction" required
              value={id.responsable_legal?.fonction}
              onChange={(v) => updatePart('identification', { responsable_legal: { ...id.responsable_legal, fonction: v } })} />
            <TextField label="Email" type="email" required
              value={id.responsable_legal?.email}
              onChange={(v) => updatePart('identification', { responsable_legal: { ...id.responsable_legal, email: v } })} />
            <TextField label="Tél." type="tel" required
              value={id.responsable_legal?.telephone}
              onChange={(v) => updatePart('identification', { responsable_legal: { ...id.responsable_legal, telephone: v } })} />
          </div>
        </fieldset>
      </FormSection>
      )}

      {/* ============================ PARTIE 2 ============================ */}
      {currentStep === 2 && (
      <FormSection title="PARTIE 2 : CONNAISSANCE DU CADRE JURIDIQUE ET CONFORMITÉ ADMINISTRATIVE">

        <RadioGroup
          legend="Connaissez-vous l'existence de la loi N°2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel ?"
          required
          inline
          options={[{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }]}
          value={cj.connaissance_loi_2013}
          onChange={(v) => updatePart('cadre_juridique', { connaissance_loi_2013: v })}
        />

        <RadioGroup
          legend="Avez-vous connaissance de vos obligations légales en tant que responsable de traitement ?"
          required
          inline
          options={[{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }]}
          value={cj.connaissance_obligations}
          onChange={(v) => updatePart('cadre_juridique', { connaissance_obligations: v })}
        />

        <RadioGroup
          legend="Avez-vous connaissance du rôle et des pouvoirs de l'ARTCI (Autorité de Régulation des Télécommunications/TIC) en matière de protection des données ?"
          required
          inline
          options={[
            { value: 'oui', label: 'Oui' },
            { value: 'non', label: 'Non' },
            { value: 'partiellement', label: 'Partiellement' },
          ]}
          value={cj.connaissance_artci}
          onChange={(v) => updatePart('cadre_juridique', { connaissance_artci: v })}
        />

        {/* Q5 reformulee */}
        <RadioGroup
          legend="Avez-vous un correspondant à la protection des données (DPO) habilité par l'ARTCI ?"
          required
          inline
          options={[
            { value: 'oui', label: 'Oui' },
            { value: 'non', label: 'Non' },
          ]}
          value={cj.dpo_habilite}
          onChange={(v) => {
            // Reset complet de la cascade quand on change de Oui/Non
            updatePart('cadre_juridique', {
              dpo_habilite: v,
              ...(v === 'non'
                ? {
                    dpo_type: undefined, dpo_externe_type: undefined,
                    dpo_physique: undefined, dpo_morale: undefined,
                    dpo_courrier_habilitation_uploaded: undefined,
                  }
                : {}),
            });
          }}
        />

        {cj.dpo_habilite === 'oui' && (
          <fieldset className="border border-gray-200 p-4 mb-4">
            <legend className="text-xs font-bold text-gray-700 px-2">Détails du DPO</legend>

            {/* 1. Sous-question obligatoire avant tout : interne ou externe */}
            <RadioGroup
              legend="Le DPO est-il interne ou externe ?"
              required
              inline
              options={[
                { value: 'interne', label: "Interne à l'organisation" },
                { value: 'externe', label: 'Externe (prestataire)' },
              ]}
              value={cj.dpo_type}
              onChange={(v) => updatePart('cadre_juridique', {
                dpo_type: v,
                // Reset des champs si on change
                ...(v === 'interne'
                  ? { dpo_externe_type: undefined, dpo_morale: undefined }
                  : {}),
              })}
            />

            {/* 2a. DPO interne : formulaire personne physique */}
            {cj.dpo_type === 'interne' && (
              <div className="border-l-2 border-[var(--artci-orange)] pl-4 mt-3">
                <p className="text-xs font-semibold text-gray-700 mb-2">Renseignements du DPO interne</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <TextField label="Nom et prénom(s)" required
                    value={cj.dpo_physique?.nom_prenom}
                    onChange={(v) => updatePart('cadre_juridique', { dpo_physique: { ...cj.dpo_physique, nom_prenom: v } })} />
                  <TextField label="Fonction"
                    value={cj.dpo_physique?.fonction}
                    onChange={(v) => updatePart('cadre_juridique', { dpo_physique: { ...cj.dpo_physique, fonction: v } })} />
                  <TextField label="Email professionnel" type="email" required
                    value={cj.dpo_physique?.email}
                    onChange={(v) => updatePart('cadre_juridique', { dpo_physique: { ...cj.dpo_physique, email: v } })} />
                  <TextField label="Téléphone" type="tel"
                    value={cj.dpo_physique?.telephone}
                    onChange={(v) => updatePart('cadre_juridique', { dpo_physique: { ...cj.dpo_physique, telephone: v } })} />
                  <TextField label="Date de désignation" type="date"
                    value={cj.dpo_physique?.date_designation}
                    onChange={(v) => updatePart('cadre_juridique', { dpo_physique: { ...cj.dpo_physique, date_designation: v } })} />
                </div>
              </div>
            )}

            {/* 2b. DPO externe : sous-question physique ou morale */}
            {cj.dpo_type === 'externe' && (
              <div className="border-l-2 border-[var(--artci-green)] pl-4 mt-3">
                <RadioGroup
                  legend="Le DPO externe est-il une personne physique ou une personne morale ?"
                  required
                  inline
                  options={[
                    { value: 'physique', label: 'Personne physique' },
                    { value: 'morale', label: 'Personne morale' },
                  ]}
                  value={cj.dpo_externe_type}
                  onChange={(v) => updatePart('cadre_juridique', {
                    dpo_externe_type: v,
                    ...(v === 'physique' ? { dpo_morale: undefined } : { dpo_physique: undefined }),
                  })}
                />

                {cj.dpo_externe_type === 'physique' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <TextField label="Nom et prénom(s)" required
                      value={cj.dpo_physique?.nom_prenom}
                      onChange={(v) => updatePart('cadre_juridique', { dpo_physique: { ...cj.dpo_physique, nom_prenom: v } })} />
                    <TextField label="Fonction"
                      value={cj.dpo_physique?.fonction}
                      onChange={(v) => updatePart('cadre_juridique', { dpo_physique: { ...cj.dpo_physique, fonction: v } })} />
                    <TextField label="Email professionnel" type="email" required
                      value={cj.dpo_physique?.email}
                      onChange={(v) => updatePart('cadre_juridique', { dpo_physique: { ...cj.dpo_physique, email: v } })} />
                    <TextField label="Téléphone" type="tel"
                      value={cj.dpo_physique?.telephone}
                      onChange={(v) => updatePart('cadre_juridique', { dpo_physique: { ...cj.dpo_physique, telephone: v } })} />
                    <TextField label="Date du contrat" type="date"
                      value={cj.dpo_physique?.date_designation}
                      onChange={(v) => updatePart('cadre_juridique', { dpo_physique: { ...cj.dpo_physique, date_designation: v } })} />
                  </div>
                )}

                {cj.dpo_externe_type === 'morale' && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Renseignements de la structure DPO externe</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <TextField label="Nom de la structure" required
                        value={cj.dpo_morale?.nom_structure}
                        onChange={(v) => updatePart('cadre_juridique', { dpo_morale: { ...cj.dpo_morale, nom_structure: v } })} />
                      <TextField label="Contact référent"
                        value={cj.dpo_morale?.contact_referent}
                        onChange={(v) => updatePart('cadre_juridique', { dpo_morale: { ...cj.dpo_morale, contact_referent: v } })} />
                      <TextField label="Email" type="email" required
                        value={cj.dpo_morale?.email_contact}
                        onChange={(v) => updatePart('cadre_juridique', { dpo_morale: { ...cj.dpo_morale, email_contact: v } })} />
                      <TextField label="Téléphone" type="tel"
                        value={cj.dpo_morale?.telephone_contact}
                        onChange={(v) => updatePart('cadre_juridique', { dpo_morale: { ...cj.dpo_morale, telephone_contact: v } })} />
                      <TextField label="Date du contrat" type="date"
                        value={cj.dpo_morale?.date_contrat}
                        onChange={(v) => updatePart('cadre_juridique', { dpo_morale: { ...cj.dpo_morale, date_contrat: v } })} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Upload obligatoire courrier d'habilitation ARTCI */}
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded">
              <p className="text-xs font-semibold text-gray-800 mb-1">
                Upload du courrier d'habilitation émis par l'ARTCI <span className="text-red-500">*</span>
              </p>
              <p className="text-[11px] text-gray-500 mb-2">Format accepté : PDF uniquement — taille max 5 Mo.</p>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f && f.size > 5 * 1024 * 1024) {
                    setError('Le courrier d\'habilitation dépasse 5 Mo.');
                    e.target.value = '';
                    return;
                  }
                  updatePart('cadre_juridique', { dpo_courrier_habilitation_uploaded: !!f });
                }}
                className="text-xs"
              />
              {cj.dpo_courrier_habilitation_uploaded && (
                <p className="text-xs text-green-600 mt-1">✓ Document PDF sélectionné</p>
              )}
            </div>
          </fieldset>
        )}
      </FormSection>
      )}

      {/* ============================ PARTIE 3 ============================ */}
      {currentStep === 3 && (
      <FormSection title="PARTIE 3 : REGISTRE ET CARTOGRAPHIE DES TRAITEMENTS">

        {/* Spec B6 : question "Savez-vous distinguer les traitements soumis a
            declaration et ceux soumis a autorisation prealable ?" supprimee
            (l'algorithme calcule deja la formalite applicable a partir des
            categories de donnees + secteur). */}

        {/* Spec 3.6.1 : 1ere question = activites de traitement DCP (multi-cases) */}
        <CheckboxGroup
          legend="Quelles activités de traitement de données à caractère personnel effectuez-vous ? (cocher toutes les options applicables)"
          required
          columns={3}
          options={[
            { value: 'collecte', label: 'Collecte' },
            { value: 'exploitation', label: 'Exploitation' },
            { value: 'enregistrement', label: 'Enregistrement' },
            { value: 'organisation', label: 'Organisation' },
            { value: 'conservation', label: 'Conservation' },
            { value: 'adaptation', label: 'Adaptation' },
            { value: 'modification', label: 'Modification' },
            { value: 'extraction', label: 'Extraction' },
            { value: 'sauvegarde', label: 'Sauvegarde' },
            { value: 'copie', label: 'Copie' },
            { value: 'consultation', label: 'Consultation' },
            { value: 'utilisation', label: 'Utilisation' },
            { value: 'communication_transmission', label: 'Communication par transmission' },
            { value: 'diffusion', label: 'Diffusion' },
            { value: 'mise_a_disposition', label: 'Mise à disposition' },
            { value: 'rapprochement_interconnexion', label: 'Rapprochement / interconnexion' },
            { value: 'verrouillage', label: 'Verrouillage' },
            { value: 'cryptage', label: 'Cryptage' },
            { value: 'effacement', label: 'Effacement' },
            { value: 'destruction', label: 'Destruction' },
          ]}
          values={reg.activites_traitement ?? []}
          onChange={(v) => updatePart('registre', { activites_traitement: v as ActiviteTraitementDCP[] })}
        />

        <CheckboxGroup
          legend="Quelles catégories de personnes sont concernées par vos traitements ? (cocher toutes les options applicables)"
          required
          columns={2}
          options={[
            { value: 'salaries_agents', label: 'Salariés/Agents' },
            { value: 'candidats_stagiaires', label: 'Candidats/Stagiaires' },
            { value: 'clients_abonnes', label: 'Clients/Abonnés' },
            { value: 'prospects', label: 'Prospects' },
            { value: 'usagers_citoyens', label: 'Usagers/Citoyens' },
            { value: 'patients', label: 'Patients' },
            { value: 'etudiants_eleves', label: 'Étudiants/Élèves' },
            { value: 'fournisseurs_partenaires', label: 'Fournisseurs/Partenaires' },
            { value: 'visiteurs', label: 'Visiteurs' },
            { value: 'adherents_membres', label: 'Adhérents/Membres' },
            { value: 'autre', label: 'Autre' },
          ] satisfies { value: CategoriePersonnes; label: string }[] as { value: CategoriePersonnes; label: string }[]}
          values={reg.categories_personnes ?? []}
          onChange={(v) => updatePart('registre', { categories_personnes: v })}
        />
        {reg.categories_personnes?.includes('autre') && (
          <TextField label="Préciser"
            value={reg.categorie_personne_autre}
            onChange={(v) => updatePart('registre', { categorie_personne_autre: v })} />
        )}

        <h3 className="text-sm font-bold text-gray-800 mt-6 mb-3">
          Quelles catégories de données traitez-vous ? (cocher toutes les options applicables)
        </h3>

        <h4 className="text-xs font-bold uppercase text-gray-600 mb-2 mt-4">DONNÉES PERSONNELLES STANDARD</h4>
        {CATEGORIES_DONNEES_CONFIG.filter((c) => c.type === 'standard').map((cat) => (
          <CategorieDonneesRow
            key={cat.key}
            titre={cat.titre}
            itemsDisponibles={cat.items}
            origineOptions={cat.origine}
            detail={reg.categories_donnees?.[cat.key as keyof typeof reg.categories_donnees]}
            onChange={(v) => updateCategorieDonnees(cat.key, v)}
          />
        ))}

        <h4 className="text-xs font-bold uppercase text-gray-600 mb-2 mt-6">DONNÉES PERSONNELLES SENSIBLES</h4>
        {CATEGORIES_DONNEES_CONFIG.filter((c) => c.type === 'sensible').map((cat) => (
          <CategorieDonneesRow
            key={cat.key}
            titre={cat.titre}
            itemsDisponibles={cat.items}
            origineOptions={cat.origine}
            detail={reg.categories_donnees?.[cat.key as keyof typeof reg.categories_donnees]}
            onChange={(v) => updateCategorieDonnees(cat.key, v)}
          />
        ))}

        {/* Déplacée depuis la Partie 4 : suit directement les catégories de données */}
        <RadioGroup
          legend="À l'issue de la durée de conservation, procédez-vous à la suppression ou l'anonymisation des données ?"
          required
          options={[
            { value: 'oui_suppression', label: 'Oui, suppression systématique' },
            { value: 'oui_anonymisation', label: 'Oui, anonymisation' },
            { value: 'oui_archivage_securise', label: 'Oui, archivage sécurisé avec accès restreint' },
            { value: 'non_indefiniment', label: 'Non, les données sont conservées indéfiniment' },
            { value: 'variable', label: 'Variable selon les cas' },
          ]}
          value={st.suppression_anonymisation}
          onChange={(v) => updatePart('sous_traitance_transferts', { suppression_anonymisation: v })}
        />

        <CheckboxGroup
          legend="Quelle est la finalité de ces traitements (but poursuivi) ?"
          required
          options={[
            { value: 'gestion_administrative', label: 'Gestion administrative' },
            { value: 'gestion_rh', label: 'Gestion des ressources humaines' },
            { value: 'gestion_clientele', label: 'Gestion de la clientèle / usagers' },
            { value: 'marketing_prospection', label: 'Marketing / prospection' },
            { value: 'suivi_medical_social', label: 'Suivi médical / social' },
            { value: 'recherche_statistiques', label: 'Recherche / statistiques' },
            { value: 'securite_controle_acces', label: "Sécurité / contrôle d'accès" },
            { value: 'autre', label: 'Autre (préciser)' },
          ] satisfies { value: Finalite; label: string }[] as { value: Finalite; label: string }[]}
          values={reg.finalites ?? []}
          onChange={(v) => updatePart('registre', { finalites: v })}
        />
        {reg.finalites?.includes('autre') && (
          <TextField label="Préciser"
            value={reg.finalite_autre_precision}
            onChange={(v) => updatePart('registre', { finalite_autre_precision: v })} />
        )}

        {/* Formalité applicable calculée automatiquement (spec §3.5, §3.7) */}
        <FormaliteCalculee form={form} />

        {/* Question dynamique pilotée par la bannière (déclaration / autorisation préalable) */}
        {(() => {
          const formalite = determinerFormalite(form);
          if (formalite.type === 'aucune') return null;
          const libelleFormalite = formalite.type === 'autorisation_prealable'
            ? "demande d'autorisation préalable"
            : 'déclaration préalable';
          return (
            <>
              <RadioGroup
                legend={`Avez-vous effectué vos formalités de ${libelleFormalite} auprès de l'ARTCI ?`}
                required
                options={[
                  { value: 'oui_tous', label: 'Oui' },
                  { value: 'en_cours', label: 'En cours' },
                  { value: 'non_aucune', label: 'Non' },
                ]}
                value={cj.formalites_effectuees}
                onChange={(v) => updatePart('cadre_juridique', { formalites_effectuees: v })}
              />

              {cj.formalites_effectuees === 'oui_tous' && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded">
                  <p className="text-xs font-semibold text-gray-800 mb-1">
                    Joindre le justificatif (récépissé de déclaration / autorisation de l'ARTCI) <span className="text-red-500">*</span>
                  </p>
                  <p className="text-[11px] text-gray-500 mb-2">Format accepté : PDF uniquement — taille max 5 Mo.</p>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f && f.size > 5 * 1024 * 1024) {
                        setError('Le justificatif dépasse 5 Mo.');
                        e.target.value = '';
                        return;
                      }
                      updatePart('cadre_juridique', { formalites_document_uploaded: !!f });
                    }}
                    className="text-xs"
                  />
                  {cj.formalites_document_uploaded && <p className="text-xs text-green-600 mt-1">✓ Document PDF sélectionné</p>}
                </div>
              )}

              {cj.formalites_effectuees === 'en_cours' && (
                <>
                  <CheckboxGroup
                    legend="À quel stade de la démarche êtes-vous ?"
                    options={[
                      { value: 'audit_initial', label: "Audit initial / Diagnostic de l'existant" },
                      { value: 'elaboration_registre', label: 'Élaboration du registre des traitements' },
                      { value: 'mesures_techniques_org', label: 'Mise en œuvre des mesures techniques et organisationnelles' },
                      { value: 'depot_declarations', label: "Dépôt des déclarations/demandes d'autorisation" },
                      { value: 'formation_personnel', label: 'Formation du personnel' },
                      { value: 'finalisation_suivi', label: 'Finalisation et suivi' },
                    ] satisfies { value: StadeDemarche; label: string }[] as { value: StadeDemarche; label: string }[]}
                    values={cj.stades_demarche ?? []}
                    onChange={(v) => updatePart('cadre_juridique', { stades_demarche: v })}
                  />
                  <RadioGroup
                    legend="Avez-vous bénéficié d'un accompagnement externe ?"
                    options={[
                      { value: 'oui', label: 'Oui (Cabinet conseil, Expert, DPO externe)' },
                      { value: 'non', label: 'Non' },
                    ]}
                    value={cj.accompagnement_externe}
                    onChange={(v) => updatePart('cadre_juridique', { accompagnement_externe: v })}
                  />
                  {cj.accompagnement_externe === 'oui' && (
                    <TextField label="Qui ?"
                      value={cj.accompagnement_qui}
                      onChange={(v) => updatePart('cadre_juridique', { accompagnement_qui: v })} />
                  )}
                </>
              )}

              {cj.formalites_effectuees === 'non_aucune' && (
                <>
                  <CheckboxGroup
                    legend="Pour quelle raison ces formalités n'ont-elles pas été effectuées ?"
                    options={[
                      { value: 'ignorance_obligation', label: "Ignorance de l'obligation" },
                      { value: 'complexite_procedure', label: 'Complexité de la procédure' },
                      { value: 'cout_eleve', label: 'Coût trop élevé' },
                      { value: 'manque_temps_ressources', label: 'Manque de temps/ressources' },
                      { value: 'pense_exempte', label: 'Pense être exempté' },
                      { value: 'autre', label: 'Autre' },
                    ] satisfies { value: RaisonNonFormalites; label: string }[] as { value: RaisonNonFormalites; label: string }[]}
                    values={cj.raisons_non_formalites ?? []}
                    onChange={(v) => updatePart('cadre_juridique', { raisons_non_formalites: v })}
                  />
                  {cj.raisons_non_formalites?.includes('pense_exempte') && (
                    <TextField label="Préciser pourquoi"
                      value={cj.raison_exempte_precision}
                      onChange={(v) => updatePart('cadre_juridique', { raison_exempte_precision: v })} />
                  )}
                  {cj.raisons_non_formalites?.includes('autre') && (
                    <TextField label="Autre (préciser)"
                      value={cj.raison_autre_precision}
                      onChange={(v) => updatePart('cadre_juridique', { raison_autre_precision: v })} />
                  )}
                </>
              )}
            </>
          );
        })()}

        {/* Déplacée : avant les bases légales, avec 3 options */}
        <RadioGroup
          legend="Disposez-vous d'un registre des activités de traitement tenu à jour ?"
          required
          options={[
            { value: 'oui', label: 'Oui' },
            { value: 'en_cours', label: "En cours d'élaboration" },
            { value: 'non', label: 'Non' },
          ]}
          value={reg.registre_tenu}
          onChange={(v) => updatePart('registre', { registre_tenu: v })}
        />

        {reg.registre_tenu === 'oui' && (
          <>
            <RadioGroup
              legend="Si oui, sous quelle forme est tenu ce registre ?"
              options={[
                { value: 'papier', label: 'Papier' },
                { value: 'tableur', label: 'Tableur (Excel, etc.)' },
                { value: 'logiciel', label: 'Logiciel/plateforme dédiée' },
                { value: 'base_donnees', label: 'Base de données' },
                { value: 'autre', label: 'Autre' },
              ]}
              value={reg.forme_registre}
              onChange={(v) => updatePart('registre', { forme_registre: v })}
            />
            {reg.forme_registre === 'autre' && (
              <TextField label="Préciser"
                value={reg.forme_registre_autre}
                onChange={(v) => updatePart('registre', { forme_registre_autre: v })} />
            )}
          </>
        )}

        <CheckboxGroup
          legend="Base légale du traitement (cocher la ou les bases applicables) :"
          required
          options={[
            { value: 'consentement', label: 'Consentement de la personne concernée' },
            { value: 'obligation_legale', label: 'Obligation légale imposant le traitement' },
            { value: 'execution_contrat', label: "Exécution d'un contrat auquel la personne est partie" },
            { value: 'interet_legitime', label: 'Intérêt légitime du responsable de traitement' },
            { value: 'mission_interet_public', label: "Mission d'intérêt public ou exercice de l'autorité publique" },
            { value: 'sauvegarde_vie', label: "Sauvegarde de l'intérêt ou des droits et libertés fondamentaux de la personne concernée" },
          ] satisfies { value: BaseLegale; label: string }[] as { value: BaseLegale; label: string }[]}
          values={reg.bases_legales ?? []}
          onChange={(v) => updatePart('registre', { bases_legales: v })}
        />
        {reg.bases_legales?.includes('obligation_legale') && (
          <TextField label="Préciser le texte"
            value={reg.base_obligation_precision}
            onChange={(v) => updatePart('registre', { base_obligation_precision: v })} />
        )}
        {reg.bases_legales?.includes('interet_legitime') && (
          <TextField label="Préciser l'intérêt légitime"
            value={reg.base_interet_precision}
            onChange={(v) => updatePart('registre', { base_interet_precision: v })} />
        )}

        <RadioGroup
          legend="Mode de traitement :"
          required
          options={[
            { value: 'automatise', label: 'Traitement automatisé (informatique)' },
            { value: 'manuel', label: 'Traitement manuel (papier)' },
            { value: 'mixte', label: 'Traitement mixte (informatique + papier)' },
          ]}
          value={reg.mode_traitement}
          onChange={(v) => updatePart('registre', { mode_traitement: v })}
        />

        <RadioGroup
          legend="Informez-vous les personnes concernées au moment de la collecte de leurs données ?"
          required
          options={[
            { value: 'oui_systematiquement', label: 'Oui, systématiquement' },
            { value: 'parfois', label: 'Parfois' },
            { value: 'non', label: 'Non' },
          ]}
          value={reg.info_personnes_collecte}
          onChange={(v) => updatePart('registre', { info_personnes_collecte: v })}
        />

        {(reg.info_personnes_collecte === 'oui_systematiquement' || reg.info_personnes_collecte === 'parfois') && (
        <>
        <CheckboxGroup
          legend="Quelles informations communiquez-vous aux personnes lors de la collecte de leurs données ? (cocher toutes les informations fournies)"
          columns={2}
          options={[
            { value: 'identite_responsable', label: 'Identité du responsable de traitement' },
            { value: 'finalites_traitement', label: 'Finalité(s) du traitement' },
            { value: 'base_legale', label: 'Base légale du traitement' },
            { value: 'caractere_obligatoire', label: 'Caractère obligatoire ou facultatif des réponses' },
            { value: 'consequences_defaut', label: "Conséquences d'un défaut de réponse" },
            { value: 'destinataires', label: 'Destinataires des données' },
            { value: 'droits_personnes', label: 'Droits des personnes (accès, rectification, opposition, etc.)' },
            { value: 'duree_conservation', label: 'Durée de conservation' },
            { value: 'coordonnees_dpo', label: 'Coordonnées du CPD/DPO' },
            { value: 'transferts_internationaux', label: 'Existence de transferts internationaux' },
            { value: 'mesures_securite', label: 'Mesures de sécurité' },
          ] satisfies { value: InfoCommuniquee; label: string }[] as { value: InfoCommuniquee; label: string }[]}
          values={reg.infos_communiquees ?? []}
          onChange={(v) => updatePart('registre', { infos_communiquees: v })}
        />

        <CheckboxGroup
          legend="Comment informez-vous les personnes ? (cocher toutes les options applicables)"
          columns={2}
          options={[
            { value: 'mentions_formulaire_papier', label: 'Mentions sur formulaire papier' },
            { value: 'politique_confidentialite_site', label: "Politique de confidentialité/Notice d'information sur site web" },
            { value: 'affichage_locaux', label: 'Affichage dans les locaux' },
            { value: 'courrier_email_personnalise', label: 'Courrier/Email personnalisé' },
            { value: 'mentions_legales', label: 'Mentions légales' },
            { value: 'autre', label: 'Autre' },
          ] satisfies { value: CommentInformer; label: string }[] as { value: CommentInformer; label: string }[]}
          values={reg.comment_informer ?? []}
          onChange={(v) => updatePart('registre', { comment_informer: v })}
        />
        {reg.comment_informer?.includes('autre') && (
          <TextField label="Préciser"
            value={reg.comment_informer_autre}
            onChange={(v) => updatePart('registre', { comment_informer_autre: v })} />
        )}
        </>
        )}

        <RadioGroup
          legend="Réutilisez-vous les données collectées pour des finalités autres que celles qui ont justifié leur collecte initiale ?"
          required
          inline
          options={[{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }]}
          value={reg.reutilisation_donnees}
          onChange={(v) => updatePart('registre', { reutilisation_donnees: v })}
        />
      </FormSection>
      )}

      {/* ============================ PARTIE 4 ============================ */}
      {currentStep === 4 && (
      <FormSection title="PARTIE 4 : SOUS-TRAITANCE, TRANSFERT DES DONNÉES">

        <RadioGroup
          legend="Avez-vous recours à des sous-traitants pour le traitement de données personnelles ?"
          required
          inline
          options={[{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }]}
          value={st.recours_sous_traitants}
          onChange={(v) => updatePart('sous_traitance_transferts', { recours_sous_traitants: v })}
        />

        {st.recours_sous_traitants === 'oui' && (
          <>
            <TextField label="Si oui, précisez combien de sous-traitants" type="number"
              value={st.nombre_sous_traitants}
              onChange={(v) => updatePart('sous_traitance_transferts', { nombre_sous_traitants: v })} />

            <RadioGroup
              legend="Avez-vous conclu des contrats de sous-traitance avec chaque sous-traitant ?"
              options={[
                { value: 'oui', label: 'Oui' },
                { value: 'non', label: 'Non' },
              ]}
              value={st.contrats_sous_traitance_existence}
              onChange={(v) => updatePart('sous_traitance_transferts', { contrats_sous_traitance_existence: v })}
            />

            {st.contrats_sous_traitance_existence === 'oui' && (
              <>
                <TextField label="Nombre de contrats de sous-traitance" type="number"
                  value={st.nombre_contrats_sous_traitance}
                  onChange={(v) => updatePart('sous_traitance_transferts', { nombre_contrats_sous_traitance: v })} />

                <PaysSelect
                  values={st.pays_sous_traitants ?? []}
                  onChange={(v) => updatePart('sous_traitance_transferts', { pays_sous_traitants: v })}
                  label="Pays de localisation des sous-traitants"
                  placeholder="Rechercher un pays…"
                />

                <CheckboxGroup
                  legend="Quelles clauses figurent dans ces contrats ? (cocher toutes les options applicables)"
                  options={[
                    { value: 'instruction_responsable', label: 'Obligation de traiter uniquement sur instruction du responsable' },
                    { value: 'confidentialite', label: 'Obligation de confidentialité' },
                    { value: 'mesures_securite', label: 'Mesures de sécurité' },
                    { value: 'possibilite_audit', label: "Possibilité d'audit" },
                    { value: 'sort_donnees_fin', label: 'Sort des données en fin de contrat (restitution ou destruction)' },
                    { value: 'interdiction_sous_traiter', label: 'Interdiction de sous-traiter sans autorisation' },
                    { value: 'toutes_clauses', label: 'Toutes les clauses ci-dessus' },
                  ] satisfies { value: ClauseObligatoire; label: string }[] as { value: ClauseObligatoire; label: string }[]}
                  values={st.clauses_obligatoires ?? []}
                  onChange={(v) => updatePart('sous_traitance_transferts', { clauses_obligatoires: v })}
                />
              </>
            )}
          </>
        )}

        <RadioGroup
          legend="Transférez-vous des données personnelles hors de l'espace CEDEAO ?"
          required
          inline
          options={[{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }]}
          value={st.transfert_hors_cedeao}
          onChange={(v) => updatePart('sous_traitance_transferts', { transfert_hors_cedeao: v })}
        />

        {st.transfert_hors_cedeao === 'oui' && (
          <fieldset className="border border-gray-200 p-4 mb-4">
            <legend className="text-xs font-bold text-gray-700 px-2">Si oui</legend>
            <div className="flex items-start gap-2 p-3 mb-4 bg-orange-50 border border-orange-200 rounded">
              <ShieldAlert className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-orange-800">
                Tout transfert de données personnelles hors de l'espace CEDEAO est
                <strong> soumis à autorisation préalable de l'ARTCI</strong> (Loi N°2013-450).
              </p>
            </div>
            {/* Spec 3.8 : selecteur multi-pays avec liste codee (hors CEDEAO) */}
            <PaysSelect
              values={st.pays_transferts ?? []}
              onChange={(v) => updatePart('sous_traitance_transferts', { pays_transferts: v })}
              label="Pays de destination *"
              placeholder="Rechercher un pays (hors CEDEAO)…"
            />
            <TextField label="Objet/finalité du transfert"
              value={st.objet_transfert}
              onChange={(v) => updatePart('sous_traitance_transferts', { objet_transfert: v })} />
            <RadioGroup
              legend="Avez-vous obtenu une autorisation préalable de l'ARTCI pour ce transfert ?"
              options={[
                { value: 'oui', label: "Oui (N° d'autorisation)" },
                { value: 'non', label: 'Non' },
                { value: 'demande_en_cours', label: 'Demande en cours' },
              ]}
              value={st.autorisation_artci_transfert}
              onChange={(v) => updatePart('sous_traitance_transferts', { autorisation_artci_transfert: v })}
            />
            {st.autorisation_artci_transfert === 'oui' && (
              <>
                <TextField label="N° d'autorisation"
                  value={st.numero_autorisation_transfert}
                  onChange={(v) => updatePart('sous_traitance_transferts', { numero_autorisation_transfert: v })} />
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded">
                  <p className="text-xs font-semibold text-gray-800 mb-1">
                    Joindre l'autorisation de transfert délivrée par l'ARTCI
                  </p>
                  <p className="text-[11px] text-gray-500 mb-2">Format accepté : PDF uniquement — taille max 5 Mo.</p>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f && f.size > 5 * 1024 * 1024) {
                        setError("L'autorisation dépasse 5 Mo.");
                        e.target.value = '';
                        return;
                      }
                      updatePart('sous_traitance_transferts', { autorisation_transfert_document_uploaded: !!f });
                    }}
                    className="text-xs"
                  />
                  {st.autorisation_transfert_document_uploaded && <p className="text-xs text-green-600 mt-1">✓ Document PDF sélectionné</p>}
                </div>
              </>
            )}
            <CheckboxGroup
              legend="Sur quelle base juridique repose le transfert ? (cocher la ou les bases applicables)"
              options={[
                { value: 'consentement', label: 'Consentement de la personne concernée' },
                { value: 'obligation_legale', label: 'Obligation légale imposant le traitement' },
                { value: 'execution_contrat', label: "Exécution d'un contrat auquel la personne est partie" },
                { value: 'interet_legitime', label: 'Intérêt légitime du responsable de traitement' },
                { value: 'mission_interet_public', label: "Mission d'intérêt public ou exercice de l'autorité publique" },
                { value: 'sauvegarde_vie', label: "Sauvegarde de l'intérêt ou des droits et libertés fondamentaux de la personne concernée" },
              ] satisfies { value: BaseLegale; label: string }[] as { value: BaseLegale; label: string }[]}
              values={st.bases_juridiques_transfert ?? []}
              onChange={(v) => updatePart('sous_traitance_transferts', { bases_juridiques_transfert: v })}
            />
            <CheckboxGroup
              legend="Quelles garanties avez-vous mises en place pour sécuriser le transfert ?"
              options={[
                { value: 'clauses_contractuelles_types', label: 'Clauses contractuelles types' },
                { value: 'bcr', label: "Règles d'entreprise contraignantes (BCR)" },
                { value: 'certification_destinataire', label: 'Certification du destinataire' },
                { value: 'accord_reciprocite', label: 'Accord de réciprocité entre États' },
                { value: 'evaluation_protection', label: 'Évaluation du niveau de protection du pays destinataire' },
                { value: 'chiffrement', label: 'Chiffrement des données transférées' },
                { value: 'autre', label: 'Autre' },
                { value: 'aucune', label: 'Aucune garantie spécifique' },
              ] satisfies { value: GarantieTransfert; label: string }[] as { value: GarantieTransfert; label: string }[]}
              values={st.garanties_transfert ?? []}
              onChange={(v) => updatePart('sous_traitance_transferts', { garanties_transfert: v })}
            />
            {st.garanties_transfert?.includes('autre') && (
              <TextField label="Préciser"
                value={st.garantie_autre}
                onChange={(v) => updatePart('sous_traitance_transferts', { garantie_autre: v })} />
            )}
          </fieldset>
        )}
      </FormSection>
      )}

      {/* ============================ PARTIE 5 ============================ */}
      {currentStep === 5 && (
      <FormSection title="PARTIE 5 : SÉCURITÉ ET FORMATION">

        {/* Spec : toutes les questions de la Partie 5 sont obligatoires */}
        <RadioGroup
          legend="Avez-vous mis en place une charte de protection des données personnelles ?"
          required
          options={[
            { value: 'oui_formalisee', label: 'Oui, formalisée et diffusée' },
            { value: 'non', label: 'Non' },
          ]}
          value={sec.politique_securite}
          onChange={(v) => updatePart('securite', { politique_securite: v })}
        />

        {/* Spec 3.9 : si Oui formalisee → upload obligatoire de la charte */}
        {sec.politique_securite === 'oui_formalisee' && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded">
            <p className="text-xs font-semibold text-gray-800 mb-1">
              Upload de la Charte de protection des données <span className="text-red-500">*</span>
            </p>
            <p className="text-[11px] text-gray-500 mb-2">Format accepté : PDF uniquement — taille max 5 Mo.</p>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && f.size > 5 * 1024 * 1024) {
                  setError('La charte dépasse 5 Mo.');
                  e.target.value = '';
                  return;
                }
                updatePart('securite', { charte_uploaded: !!f });
              }}
              className="text-xs"
            />
            {sec.charte_uploaded && <p className="text-xs text-green-600 mt-1">✓ Document PDF sélectionné</p>}
          </div>
        )}

        {/* Spec 3.9 : Mesures techniques en multi-select */}
        <CheckboxGroup
          legend="Quelles mesures techniques de sécurité sont mises en place ? (cocher toutes les options applicables)"
          required
          columns={2}
          options={[
            { value: 'mots_de_passe_forts', label: 'Mots de passe forts' },
            { value: 'chiffrement_donnees', label: 'Chiffrement des données' },
            { value: 'chiffrement_communications', label: 'Chiffrement des communications' },
            { value: 'pare_feu', label: 'Pare-feu' },
            { value: 'antivirus_antimalware', label: 'Antivirus / antimalware' },
            { value: 'sauvegardes_regulieres', label: 'Sauvegardes régulières' },
            { value: 'mises_a_jour_systeme', label: 'Mises à jour système' },
            { value: 'detection_intrusion', label: "Détection d'intrusion" },
            { value: 'segmentation_reseau', label: 'Segmentation réseau' },
            { value: 'authentification_multi_facteurs', label: 'Authentification multi-facteurs (MFA)' },
            { value: 'journalisation_logs', label: 'Journalisation / logs' },
            { value: 'autre', label: 'Autre' },
          ] satisfies { value: MesureTechnique; label: string }[] as { value: MesureTechnique; label: string }[]}
          values={sec.mesures_techniques_list ?? []}
          onChange={(v) => updatePart('securite', { mesures_techniques_list: v })}
        />
        {sec.mesures_techniques_list?.includes('autre') && (
          <TextField label="Préciser autre mesure technique"
            value={sec.mesures_techniques_autre}
            onChange={(v) => updatePart('securite', { mesures_techniques_autre: v })} />
        )}

        {/* Spec 3.9 : Mesures organisationnelles en multi-select */}
        <CheckboxGroup
          legend="Quelles mesures organisationnelles sont prévues ? (cocher toutes les options applicables)"
          required
          columns={2}
          options={[
            { value: 'restriction_acces', label: "Restriction d'accès" },
            { value: 'habilitations', label: 'Habilitations' },
            { value: 'sensibilisation_personnel', label: 'Sensibilisation du personnel' },
            { value: 'charte_informatique', label: 'Charte informatique' },
            { value: 'gestion_droits_utilisateurs', label: 'Gestion des droits utilisateurs' },
            { value: 'procedure_arrivee_depart', label: 'Procédure arrivée / départ' },
            { value: 'audit_interne_periodique', label: 'Audit interne périodique' },
            { value: 'plan_continuite_activite', label: "Plan de continuité d'activité" },
            { value: 'separation_environnements', label: 'Séparation des environnements' },
            { value: 'gestion_prestataires', label: 'Gestion des prestataires' },
            { value: 'autre', label: 'Autre' },
          ] satisfies { value: MesureOrganisationnelle; label: string }[] as { value: MesureOrganisationnelle; label: string }[]}
          values={sec.mesures_organisationnelles_list ?? []}
          onChange={(v) => updatePart('securite', { mesures_organisationnelles_list: v })}
        />
        {sec.mesures_organisationnelles_list?.includes('autre') && (
          <TextField label="Préciser autre mesure organisationnelle"
            value={sec.mesures_organisationnelles_autre}
            onChange={(v) => updatePart('securite', { mesures_organisationnelles_autre: v })} />
        )}

        {/* Déplacée depuis la Partie 4 (Sous-traitance) — juste après les mesures organisationnelles */}
        <RadioGroup
          legend="Les supports de stockage envoyés en réparation ou à la destruction font-ils l'objet d'une procédure de protection (effacement sécurisé) ?"
          required
          options={[
            { value: 'oui_documentee', label: 'Oui, procédure documentée' },
            { value: 'non', label: 'Non' },
            { value: 'non_applicable', label: 'Non applicable' },
          ]}
          value={st.protection_supports}
          onChange={(v) => updatePart('sous_traitance_transferts', { protection_supports: v })}
        />

        <RadioGroup
          legend="Avez-vous subi une violation de données personnelles (fuite, perte, accès non autorisé, etc.) au cours des 12 derniers mois ?"
          required
          inline
          options={[
            { value: 'oui', label: 'Oui' },
            { value: 'non', label: 'Non' },
            { value: 'ne_sais_pas', label: 'Ne sais pas' },
          ]}
          value={sec.violation_12mois}
          onChange={(v) => updatePart('securite', { violation_12mois: v })}
        />

        {sec.violation_12mois === 'oui' && (
          <fieldset className="border border-gray-200 p-4 mb-4">
            <legend className="text-xs font-bold text-gray-700 px-2">Si oui</legend>
            <TextField label="Nombre approximatif de violations" type="number"
              value={sec.nombre_violations}
              onChange={(v) => updatePart('securite', { nombre_violations: v })} />
            <RadioGroup
              legend="Avez-vous notifié l'ARTCI dans les meilleurs délais ?"
              options={[
                { value: 'oui_72h', label: 'Oui, dans les 72 heures' },
                { value: 'oui_tardivement', label: 'Oui, mais tardivement' },
                { value: 'non', label: 'Non' },
              ]}
              value={sec.notification_artci}
              onChange={(v) => updatePart('securite', { notification_artci: v })}
            />
            <RadioGroup
              legend="Avez-vous informé les personnes concernées ?"
              inline
              options={[
                { value: 'oui', label: 'Oui' },
                { value: 'non', label: 'Non' },
                { value: 'certains_cas', label: 'Seulement dans certains cas' },
              ]}
              value={sec.info_personnes_violation}
              onChange={(v) => updatePart('securite', { info_personnes_violation: v })}
            />
          </fieldset>
        )}

        {/* B27 : registre des violations + upload si Oui */}
        <RadioGroup
          legend="Tenez-vous un registre/inventaire des violations de données ?"
          required
          inline
          options={[{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }]}
          value={sec.registre_violations}
          onChange={(v) => updatePart('securite', { registre_violations: v })}
        />
        {sec.registre_violations === 'oui' && (
          <div className="border border-gray-200 rounded p-3 mb-4 bg-gray-50">
            <label className="text-xs font-semibold block mb-2">
              Téléverser le registre des violations (PDF, max 5 Mo)
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && f.size > 5 * 1024 * 1024) {
                  setError('Le registre dépasse 5 Mo.');
                  e.target.value = '';
                  return;
                }
                updatePart('securite', { registre_violations_uploaded: !!f });
              }}
              className="text-xs"
            />
            {sec.registre_violations_uploaded && (
              <p className="text-xs text-green-600 mt-1">✓ Document PDF sélectionné</p>
            )}
          </div>
        )}

        {/* B28 : procedures de reaction (2 options) + upload si Oui */}
        <RadioGroup
          legend="Avez-vous défini des procédures de réaction et de remontée d'informations en cas de violation ?"
          required
          options={[
            { value: 'oui_documentee_testee', label: 'Oui, procédure documentée et testée' },
            { value: 'non', label: 'Non' },
          ]}
          value={sec.procedures_violation}
          onChange={(v) => updatePart('securite', { procedures_violation: v })}
        />
        {sec.procedures_violation === 'oui_documentee_testee' && (
          <div className="border border-gray-200 rounded p-3 mb-4 bg-gray-50">
            <label className="text-xs font-semibold block mb-2">
              Téléverser le document de procédure (PDF, max 5 Mo)
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && f.size > 5 * 1024 * 1024) {
                  setError('Le document dépasse 5 Mo.');
                  e.target.value = '';
                  return;
                }
                updatePart('securite', { procedures_violation_uploaded: !!f });
              }}
              className="text-xs"
            />
            {sec.procedures_violation_uploaded && (
              <p className="text-xs text-green-600 mt-1">✓ Document PDF sélectionné</p>
            )}
          </div>
        )}

        {/* B29 : formations — cases a cocher pour la frequence des sensibilisations */}
        <RadioGroup
          legend="Les personnels sont-ils sensibilisés/formés à la protection des données ?"
          required
          options={[
            { value: 'oui_formation_initiale', label: 'Oui, formation initiale obligatoire' },
            { value: 'oui_sensibilisation_periodique', label: 'Oui, sensibilisations périodiques' },
            { value: 'formation_ponctuelle', label: 'Formation ponctuelle' },
            { value: 'non', label: 'Non' },
          ]}
          value={sec.personnel_sensibilise}
          onChange={(v) => updatePart('securite', { personnel_sensibilise: v })}
        />

        {sec.personnel_sensibilise === 'oui_sensibilisation_periodique' && (
          <CheckboxGroup
            legend="Précisez la ou les fréquences des sensibilisations :"
            columns={2}
            options={[
              { value: 'mensuelle', label: 'Mensuelle' },
              { value: 'trimestrielle', label: 'Trimestrielle' },
              { value: 'semestrielle', label: 'Semestrielle' },
              { value: 'annuelle', label: 'Annuelle' },
            ]}
            values={sec.frequences_sensibilisation ?? []}
            onChange={(v) => updatePart('securite', { frequences_sensibilisation: v })}
          />
        )}
      </FormSection>
      )}

      {/* ============================ PARTIE 6 : RECAPITULATIF ============================ */}
      {currentStep === 6 && (
        <RecapView form={form} onEdit={(step) => setCurrentStep(step as StepNum)} />
      )}

      </div>

      {/* ============================ ACTIONS NAVIGATION (Precedent / Suivant / Sauver / Soumettre) ============================ */}
      {!isReadOnly && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mt-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            {/* Bouton Precedent */}
            <button
              onClick={goPrev}
              disabled={currentStep === 1}
              className="btn btn-outline flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" /> Précédent
            </button>

            {/* Bouton Sauvegarder brouillon (toujours dispo sauf en mode admin sans entiteId initial) */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-outline flex items-center gap-2 text-[var(--artci-green)] border-[var(--artci-green)]"
            >
              {saving ? (
                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              ) : <Save className="w-4 h-4" />}
              {isAdminMode ? 'Enregistrer' : 'Sauvegarder le brouillon'}
            </button>

            {/* Bouton Suivant ou Soumettre */}
            {currentStep < 6 ? (
              <button
                onClick={goNext}
                className="btn btn-primary flex items-center gap-2"
              >
                Suivant <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              !isAdminMode ? (
                <button
                  onClick={() => setShowSubmitConfirm(true)}
                  disabled={submitting || showSubmitConfirm}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Soumettre définitivement
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Enregistrer
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* ============================ MODALE DE CONFIRMATION SOUMISSION ============================ */}
      {showSubmitConfirm && !isAdminMode && !isReadOnly && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowSubmitConfirm(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-7 h-7 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Confirmer la soumission
                </h2>
                <p className="text-sm text-gray-700 mb-2">
                  Assurez-vous d'avoir vérifié <strong>toutes vos réponses</strong>.
                </p>
                <p className="text-sm text-red-700 font-semibold">
                  ⚠ Cette action est irréversible. Après soumission, vous ne pourrez
                  <strong> plus modifier votre dossier </strong>
                  avant retour de l'ARTCI.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="btn btn-outline flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Vérifier à nouveau
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn btn-secondary flex items-center gap-2 text-base px-5 py-2.5"
                style={{ backgroundColor: 'var(--artci-green)', color: 'white', borderColor: 'var(--artci-green)' }}
              >
                {submitting ? (
                  <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                ) : <Send className="w-5 h-5" />}
                Soumettre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PARTIE 6 : RECAPITULATIF — vue lecture seule de toutes les reponses
// ============================================================================
export function RecapView({ form, onEdit }: { form: FormulaireDCP; onEdit: (step: number) => void }) {
  const id = form.identification ?? {};
  const cj = form.cadre_juridique ?? {};
  const reg = form.registre ?? {};
  const st = form.sous_traitance_transferts ?? {};
  const sec = form.securite ?? {};

  // Rend un code technique lisible : "oui_systematiquement" → "Oui systematiquement"
  function prettify(s: string): string {
    if (!s.trim()) return s;
    const spaced = s.replace(/_/g, ' ').trim();
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  }

  function fmt(v: unknown): string {
    if (v === undefined || v === null) return '—';
    if (typeof v === 'boolean') return v ? 'Oui' : 'Non';
    if (Array.isArray(v)) return v.length === 0 ? '—' : v.map((x) => prettify(String(x))).join(', ');
    if (typeof v === 'object') return JSON.stringify(v);
    if (typeof v === 'string') return v.trim() ? prettify(v) : '—';
    return String(v);
  }

  function Row({ label, value }: { label: string; value: unknown }) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-600 sm:col-span-1">{label}</span>
        <span className="text-sm text-gray-900 sm:col-span-2 break-words">{fmt(value)}</span>
      </div>
    );
  }

  function SectionRecap({ titre, stepNum, children }: { titre: string; stepNum: number; children: React.ReactNode }) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg mb-4 overflow-hidden">
        <div className="flex items-center justify-between bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h3 className="font-bold text-sm text-[var(--artci-orange)]">{titre}</h3>
          <button
            onClick={() => onEdit(stepNum)}
            className="text-xs text-[var(--artci-green)] hover:underline"
          >
            Modifier →
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    );
  }

  const categoriesRenseignees = CATEGORIES_DONNEES_CONFIG
    .filter((c) => (reg.categories_donnees as Record<string, { items_coches?: unknown[] }>)?.[c.key]?.items_coches?.length)
    .map((c) => c.titre);
  const categoriesRenseigneesStr = categoriesRenseignees.length === 0
    ? '—'
    : `${categoriesRenseignees.length} : ${categoriesRenseignees.join(', ')}`;

  const formaliteType = determinerFormalite(form).type;
  const formaliteLabel = formaliteType === 'autorisation_prealable' ? 'Autorisation préalable'
    : formaliteType === 'declaration_prealable' ? 'Déclaration préalable'
      : 'Aucune';

  const statutLabel = id.statut_juridique === 'pm_droit_prive' ? 'Personne morale de droit privé'
    : id.statut_juridique === 'pm_droit_public' ? 'Personne morale de droit public'
      : id.statut_juridique === 'personne_physique' ? 'Personne physique'
        : id.statut_juridique;

  return (
    <div>
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 flex items-start gap-3">
        <ListChecks className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
        <div>
          <h2 className="text-lg font-bold text-orange-900 mb-1">Récapitulatif de votre dossier</h2>
          <p className="text-sm text-orange-800">
            Vérifiez attentivement l'ensemble de vos réponses ci-dessous avant de soumettre.
            Vous pouvez cliquer sur « Modifier » dans chaque section pour revenir sur une partie.
          </p>
        </div>
      </div>

      <SectionRecap titre="Partie 1 — Identification de l'entité" stepNum={1}>
        <Row label="Statut juridique" value={statutLabel} />
        <Row label="Dénomination" value={id.personne_morale?.denomination_officielle ?? id.personne_physique?.nom_prenom} />
        <Row label="N° CC" value={id.personne_morale?.numero_cc} />
        <Row label="Ville / Région" value={`${id.personne_morale?.ville ?? id.personne_physique?.ville ?? '—'} / ${id.personne_morale?.region ?? id.personne_physique?.region ?? '—'}`} />
        <Row label="Secteur(s) d'activité" value={id.secteurs_activite} />
        <Row label="Volume de données" value={id.volume_donnees} />
        <Row label="Responsable légal" value={`${id.responsable_legal?.nom_prenom ?? '—'} (${id.responsable_legal?.email ?? '—'})`} />
        <Row label="Localisation GPS" value={
          (typeof id.localisation?.latitude === 'number' && typeof id.localisation?.longitude === 'number')
            ? `${id.localisation.latitude.toFixed(6)}, ${id.localisation.longitude.toFixed(6)}`
            : '—'
        } />
      </SectionRecap>

      <SectionRecap titre="Partie 2 — Cadre juridique" stepNum={2}>
        <Row label="Connaissance Loi 2013-450" value={cj.connaissance_loi_2013} />
        <Row label="Connaissance obligations" value={cj.connaissance_obligations} />
        <Row label="Connaissance rôle ARTCI" value={cj.connaissance_artci} />
        <Row label="DPO habilité ARTCI" value={cj.dpo_habilite} />
        {cj.dpo_habilite === 'oui' && (
          <>
            <Row label="Type DPO" value={cj.dpo_type} />
            {cj.dpo_type === 'externe' && <Row label="DPO externe" value={cj.dpo_externe_type} />}
            <Row label="DPO (nom)" value={cj.dpo_physique?.nom_prenom ?? cj.dpo_morale?.nom_structure} />
            <Row label="Courrier d'habilitation ARTCI" value={cj.dpo_courrier_habilitation_uploaded} />
          </>
        )}
      </SectionRecap>

      <SectionRecap titre="Partie 3 — Registre & cartographie des traitements" stepNum={3}>
        <Row label="Distinction Déclaration/Autorisation" value={cj.distinction_decl_aut} />
        <Row label="Activités de traitement" value={reg.activites_traitement} />
        <Row label="Registre de traitement" value={reg.registre_tenu} />
        <Row label="Catégories de personnes" value={reg.categories_personnes} />
        <Row label="Catégories de données renseignées" value={categoriesRenseigneesStr} />
        <Row label="Action après conservation" value={st.suppression_anonymisation} />
        <Row label="Finalités" value={reg.finalites} />
        <Row label="Formalité à effectuer" value={formaliteLabel} />
        <Row label="Bases légales" value={reg.bases_legales} />
        <Row label="Mode de traitement" value={reg.mode_traitement} />
        <Row label="Information aux personnes concernées" value={reg.info_personnes_collecte} />
        <Row label="Informations communiquées lors de la collecte" value={reg.infos_communiquees} />
        <Row label="Réutilisation données" value={reg.reutilisation_donnees} />
      </SectionRecap>

      <SectionRecap titre="Partie 4 — Sous-traitance & transferts" stepNum={4}>
        <Row label="Recours à sous-traitants" value={st.recours_sous_traitants} />
        {st.recours_sous_traitants === 'oui' && (
          <>
            <Row label="Nombre de sous-traitants" value={st.nombre_sous_traitants} />
            <Row label="Contrats de sous-traitance" value={st.contrats_sous_traitance_existence} />
            {st.contrats_sous_traitance_existence === 'oui' && (
              <>
                <Row label="Nombre de contrats" value={st.nombre_contrats_sous_traitance} />
                <Row label="Pays des sous-traitants" value={st.pays_sous_traitants} />
                <Row label="Clauses des contrats" value={st.clauses_obligatoires} />
              </>
            )}
          </>
        )}
        <Row label="Transfert hors CEDEAO" value={st.transfert_hors_cedeao} />
        {st.transfert_hors_cedeao === 'oui' && (
          <>
            <Row label="Pays de transfert" value={st.pays_transferts} />
            <Row label="Autorisation ARTCI transfert" value={st.autorisation_artci_transfert} />
            <Row label="Bases juridiques transfert" value={st.bases_juridiques_transfert} />
            <Row label="Garanties" value={st.garanties_transfert} />
          </>
        )}
      </SectionRecap>

      <SectionRecap titre="Partie 5 — Sécurité & formation" stepNum={5}>
        <Row label="Charte protection des données" value={sec.politique_securite} />
        <Row label="Protection des supports" value={st.protection_supports} />
        {sec.politique_securite === 'oui_formalisee' && (
          <Row label="Charte uploadée" value={sec.charte_uploaded} />
        )}
        <Row label="Mesures techniques" value={sec.mesures_techniques_list} />
        <Row label="Mesures organisationnelles" value={sec.mesures_organisationnelles_list} />
        <Row label="Violation (12 mois)" value={sec.violation_12mois} />
        {sec.violation_12mois === 'oui' && (
          <>
            <Row label="Nombre violations" value={sec.nombre_violations} />
            <Row label="Notification ARTCI" value={sec.notification_artci} />
          </>
        )}
        <Row label="Registre violations" value={sec.registre_violations} />
        <Row label="Procédures violation" value={sec.procedures_violation} />
        <Row label="Personnel sensibilisé" value={sec.personnel_sensibilise} />
      </SectionRecap>
    </div>
  );
}
