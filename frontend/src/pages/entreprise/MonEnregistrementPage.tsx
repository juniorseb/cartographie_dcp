/**
 * Page "Mon enregistrement" - QUESTIONNAIRE DE RECENSEMENT ET D'EVALUATION
 * DE LA CONFORMITE A LA LOI N°2013-450.
 *
 * Toutes les questions, options et libellés correspondent EXACTEMENT au
 * document Word officiel "QUESTIONNAIRE DE RECENSEMENT DCP.docx".
 */
import { useState, useEffect, useCallback } from 'react';
import { Save, Send, AlertTriangle, Lock } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as entrepriseApi from '@/api/entreprise.api';
import Loading from '@/components/common/Loading';
import {
  FormSection, RadioGroup, CheckboxGroup, TextField, TextArea,
} from '@/components/entreprise/dcp-form/FormFields';
import CategorieDonneesRow from '@/components/entreprise/dcp-form/CategorieDonneesRow';
import { CATEGORIES_DONNEES_CONFIG } from '@/components/entreprise/dcp-form/categories-donnees-config';
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
  type BaseJuridiqueTransfert,
  type GarantieTransfert,
  type CategorieDonneesDetail,
  type ActiviteTraitementDCP,
  type MesureTechnique, type MesureOrganisationnelle,
} from '@/types/formulaire-dcp';

// Statuts pour lesquels le formulaire est en LECTURE SEULE
const STATUTS_LECTURE_SEULE = ['soumis', 'en_verification'];

export default function MonEnregistrementPage() {
  const [form, setForm] = useState<FormulaireDCP>(emptyFormulaireDCP());
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [statutWorkflow, setStatutWorkflow] = useState<string | null>(null);

  const { data, isLoading } = useApi(() => entrepriseApi.getFormulaireDCP(), []);
  // Charger aussi le statut workflow pour determiner si le formulaire est en lecture seule
  const { data: dossier } = useApi(() => entrepriseApi.getMonDossier(), []);

  useEffect(() => {
    if (data?.reponses && Object.keys(data.reponses).length > 0) {
      setForm({ ...emptyFormulaireDCP(), ...(data.reponses as Partial<FormulaireDCP>) });
    }
  }, [data]);

  useEffect(() => {
    if (dossier?.workflow?.statut) {
      setStatutWorkflow(dossier.workflow.statut);
    }
  }, [dossier]);

  const isReadOnly = statutWorkflow !== null && STATUTS_LECTURE_SEULE.includes(statutWorkflow);

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

  async function handleSave() {
    setSaving(true); setError(''); setSuccess('');
    try {
      await entrepriseApi.saveFormulaireDCP(form as unknown as Record<string, unknown>);
      setSuccess('Brouillon sauvegardé.');
    } catch {
      setError("Erreur lors de la sauvegarde.");
    } finally { setSaving(false); }
  }

  async function handleSubmit() {
    setSubmitting(true); setError(''); setSuccess(''); setShowSubmitConfirm(false);
    try {
      await entrepriseApi.saveFormulaireDCP(form as unknown as Record<string, unknown>);
      await entrepriseApi.soumettreFormulaireDCP();
      setSuccess('Dossier soumis à l\'ARTCI avec succès. Vous serez notifié(e) après traitement.');
      setStatutWorkflow('soumis');
    } catch {
      setError("Erreur lors de la soumission.");
    } finally { setSubmitting(false); }
  }

  if (isLoading) return <Loading fullPage text="Chargement du formulaire..." />;

  const id = form.identification;
  const cj = form.cadre_juridique;
  const reg = form.registre;
  const st = form.sous_traitance_transferts;
  const sec = form.securite;

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Mon enregistrement</h1>
        <p className="text-sm text-gray-600">
          QUESTIONNAIRE DE RECENSEMENT ET D'ÉVALUATION DE LA CONFORMITÉ À LA LOI N°2013-450 RELATIVE À LA
          PROTECTION DES DONNÉES À CARACTÈRE PERSONNEL EN CÔTE D'IVOIRE
        </p>
      </div>

      <div className="alert alert-info mb-6 text-sm">
        Ce questionnaire a pour finalité d'établir un registre des entités procédant au traitement
        des données à caractère personnel et d'évaluer leur niveau de conformité.
        Conformément à l'article 45 de la loi N°2013-450, toute entrave à l'action de l'Autorité
        de protection des données est passible de sanctions pénales.
      </div>

      {error && <div className="alert alert-danger mb-4">{error}</div>}
      {success && <div className="alert alert-success mb-4">{success}</div>}

      {/* Bandeau lecture seule si dossier soumis / en verification */}
      {isReadOnly && (
        <div className="alert alert-info mb-6 flex items-start gap-3">
          <Lock className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Formulaire en lecture seule.</strong>
            <p className="text-sm mt-1">
              Votre dossier est en cours de vérification par l'ARTCI. Le formulaire sera
              de nouveau modifiable après retour de l'ARTCI.
            </p>
          </div>
        </div>
      )}

      <div className={isReadOnly ? 'opacity-60 pointer-events-none' : ''}>

      {/* ============================ PARTIE 1 ============================ */}
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
              <TextField label="Dénomination officielle"
                value={id.personne_morale?.denomination_officielle}
                onChange={(v) => updatePart('identification', { personne_morale: { ...id.personne_morale, denomination_officielle: v } })} />
              <TextField label="Raison sociale"
                value={id.personne_morale?.raison_sociale}
                onChange={(v) => updatePart('identification', { personne_morale: { ...id.personne_morale, raison_sociale: v } })} />
              <TextField label="N° CC" required
                value={id.personne_morale?.numero_cc}
                onChange={(v) => updatePart('identification', { personne_morale: { ...id.personne_morale, numero_cc: v } })} />
              <TextField label="Ville"
                value={id.personne_morale?.ville}
                onChange={(v) => updatePart('identification', { personne_morale: { ...id.personne_morale, ville: v } })} />
              <TextField label="Commune"
                value={id.personne_morale?.commune}
                onChange={(v) => updatePart('identification', { personne_morale: { ...id.personne_morale, commune: v } })} />
              <TextField label="Région"
                value={id.personne_morale?.region}
                onChange={(v) => updatePart('identification', { personne_morale: { ...id.personne_morale, region: v } })} />
            </div>
            <TextArea label="Adresse complète du siège" rows={2}
              value={id.personne_morale?.adresse_siege}
              onChange={(v) => updatePart('identification', { personne_morale: { ...id.personne_morale, adresse_siege: v } })} />
          </fieldset>
        )}

        {id.statut_juridique === 'personne_physique' && (
          <fieldset className="border border-gray-200 p-4 mb-4">
            <legend className="text-xs font-bold text-gray-700 px-2">PERSONNE PHYSIQUE</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField label="Nom & prénom(s)"
                value={id.personne_physique?.nom_prenom}
                onChange={(v) => updatePart('identification', { personne_physique: { ...id.personne_physique, nom_prenom: v } })} />
              <TextField label="Fonction"
                value={id.personne_physique?.fonction}
                onChange={(v) => updatePart('identification', { personne_physique: { ...id.personne_physique, fonction: v } })} />
              <TextField label="Ville"
                value={id.personne_physique?.ville}
                onChange={(v) => updatePart('identification', { personne_physique: { ...id.personne_physique, ville: v } })} />
              <TextField label="Commune"
                value={id.personne_physique?.commune}
                onChange={(v) => updatePart('identification', { personne_physique: { ...id.personne_physique, commune: v } })} />
              <TextField label="Région"
                value={id.personne_physique?.region}
                onChange={(v) => updatePart('identification', { personne_physique: { ...id.personne_physique, region: v } })} />
            </div>
            <TextArea label="Adresse complète du siège" rows={2}
              value={id.personne_physique?.adresse}
              onChange={(v) => updatePart('identification', { personne_physique: { ...id.personne_physique, adresse: v } })} />
          </fieldset>
        )}

        <RadioGroup
          legend="Secteur d'activité"
          options={[
            { value: 'tic', label: 'Télécommunications / TIC' },
            { value: 'banque_finance_assurance', label: 'Banque / Finance / Assurance' },
            { value: 'sante', label: 'Santé' },
            { value: 'education', label: 'Éducation' },
            { value: 'commerce_services', label: 'Commerce / Services' },
            { value: 'autre', label: 'Autre' },
          ]}
          value={id.secteur_activite}
          onChange={(v) => updatePart('identification', { secteur_activite: v })}
        />
        {id.secteur_activite === 'autre' && (
          <TextField label="Préciser"
            value={id.secteur_autre}
            onChange={(v) => updatePart('identification', { secteur_autre: v })} />
        )}

        <RadioGroup
          legend="Volume approximatif de données personnelles traitées :"
          options={[
            { value: 'moins_1000', label: 'Moins de 1 000 personnes concernées' },
            { value: '1000_10000', label: '1 000 à 10 000 personnes' },
            { value: '10000_100000', label: '10 000 à 100 000 personnes' },
            { value: 'plus_100000', label: 'Plus de 100 000 personnes' },
          ]}
          value={id.volume_donnees}
          onChange={(v) => updatePart('identification', { volume_donnees: v })}
        />

        <fieldset className="border border-gray-200 p-4">
          <legend className="text-xs font-bold text-gray-700 px-2">Responsable légal de l'organisation</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField label="Nom et prénom(s)"
              value={id.responsable_legal?.nom_prenom}
              onChange={(v) => updatePart('identification', { responsable_legal: { ...id.responsable_legal, nom_prenom: v } })} />
            <TextField label="Fonction"
              value={id.responsable_legal?.fonction}
              onChange={(v) => updatePart('identification', { responsable_legal: { ...id.responsable_legal, fonction: v } })} />
            <TextField label="Email" type="email"
              value={id.responsable_legal?.email}
              onChange={(v) => updatePart('identification', { responsable_legal: { ...id.responsable_legal, email: v } })} />
            <TextField label="Tél." type="tel"
              value={id.responsable_legal?.telephone}
              onChange={(v) => updatePart('identification', { responsable_legal: { ...id.responsable_legal, telephone: v } })} />
          </div>
        </fieldset>
      </FormSection>

      {/* ============================ PARTIE 2 ============================ */}
      <FormSection title="PARTIE 2 : CONNAISSANCE DU CADRE JURIDIQUE ET CONFORMITÉ ADMINISTRATIVE">

        <RadioGroup
          legend="Connaissez-vous l'existence de la loi N°2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel ?"
          inline
          options={[{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }]}
          value={cj.connaissance_loi_2013}
          onChange={(v) => updatePart('cadre_juridique', { connaissance_loi_2013: v })}
        />

        <RadioGroup
          legend="Avez-vous connaissance de vos obligations légales en tant que responsable de traitement ?"
          inline
          options={[{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }]}
          value={cj.connaissance_obligations}
          onChange={(v) => updatePart('cadre_juridique', { connaissance_obligations: v })}
        />

        <RadioGroup
          legend="Avez-vous connaissance du rôle et des pouvoirs de l'ARTCI (Autorité de Régulation des Télécommunications/TIC) en matière de protection des données ?"
          inline
          options={[
            { value: 'oui', label: 'Oui' },
            { value: 'non', label: 'Non' },
            { value: 'partiellement', label: 'Partiellement' },
          ]}
          value={cj.connaissance_artci}
          onChange={(v) => updatePart('cadre_juridique', { connaissance_artci: v })}
        />

        {/* Q5 reformulee : "Avez-vous un DPO habilite par l'ARTCI ?" */}
        <RadioGroup
          legend="Avez-vous un DPO habilité par l'ARTCI ?"
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
              <p className="text-xs font-semibold text-gray-800 mb-2">
                Upload du courrier d'habilitation émis par l'ARTCI <span className="text-red-500">*</span>
              </p>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => updatePart('cadre_juridique', {
                  dpo_courrier_habilitation_uploaded: !!e.target.files?.[0],
                })}
                className="text-xs"
              />
              {cj.dpo_courrier_habilitation_uploaded && (
                <p className="text-xs text-green-600 mt-1">✓ Document sélectionné</p>
              )}
            </div>

            <RadioGroup
              legend="Le DPO a-t-il le profil requis selon l'Arrêté N° 511/MPTIC/CAB ?"
              inline
              options={[
                { value: 'oui', label: 'Oui' },
                { value: 'non', label: 'Non' },
                { value: 'ne_sais_pas', label: 'Ne sais pas' },
              ]}
              value={cj.cpd_profil_requis}
              onChange={(v) => updatePart('cadre_juridique', { cpd_profil_requis: v })}
            />
          </fieldset>
        )}

        <RadioGroup
          legend="Savez-vous distinguer les traitements soumis à déclaration et ceux soumis à autorisation préalable ?"
          inline
          options={[
            { value: 'oui', label: 'Oui' },
            { value: 'non', label: 'Non' },
            { value: 'incertain', label: 'Incertain' },
          ]}
          value={cj.distinction_decl_aut}
          onChange={(v) => updatePart('cadre_juridique', { distinction_decl_aut: v })}
        />

        {/* Note : la question "Avez-vous effectue les formalites necessaires..." a ete deplacee
            apres les finalites et est maintenant CALCULEE AUTOMATIQUEMENT (cf. §3.5 et §3.7).
            Le resultat (Autorisation prealable vs Declaration prealable) sera affiche
            dans le recapitulatif final. */}

        <RadioGroup
          legend="Avez-vous effectué les formalités nécessaires auprès de l'ARTCI pour vos traitements de données ?"
          options={[
            { value: 'oui_tous', label: 'Oui, tous les traitements sont déclarés/autorisés' },
            { value: 'non_aucune', label: "Non, aucune formalité n'a été effectuée" },
            { value: 'en_cours', label: 'En cours' },
          ]}
          value={cj.formalites_effectuees}
          onChange={(v) => updatePart('cadre_juridique', { formalites_effectuees: v })}
        />

        {cj.formalites_effectuees === 'en_cours' && (
          <>
            <CheckboxGroup
              legend="Si une démarche est en cours, à quel stade êtes-vous ?"
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
              legend="Si une démarche est en cours, avez-vous bénéficié d'un accompagnement externe ?"
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
              legend="Si vous n'avez pas effectué de formalités, quelle en est la raison ?"
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
      </FormSection>

      {/* ============================ PARTIE 3 ============================ */}
      <FormSection title="PARTIE 3 : REGISTRE ET CARTOGRAPHIE DES TRAITEMENTS">

        {/* Spec 3.6.1 : 1ere question = activites de traitement DCP (multi-cases) */}
        <CheckboxGroup
          legend="Quelles activités de traitement de données à caractère personnel effectuez-vous ? (cocher toutes les options applicables)"
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

        <RadioGroup
          legend="Disposez-vous d'un registre des activités de traitement tenu à jour ?"
          options={[
            { value: 'oui_complet', label: 'Oui, complet et à jour' },
            { value: 'oui_incomplet', label: 'Oui, mais incomplet ou obsolète' },
            { value: 'en_cours', label: "En cours d'élaboration" },
            { value: 'non', label: 'Non' },
          ]}
          value={reg.registre_tenu}
          onChange={(v) => updatePart('registre', { registre_tenu: v })}
        />

        {(reg.registre_tenu === 'oui_complet' || reg.registre_tenu === 'oui_incomplet') && (
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
          legend="Quelles catégories de personnes sont concernées par vos traitements ? (cocher toutes les options applicables)"
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

        <CheckboxGroup
          legend="Quelle est la finalité de ces traitements (but poursuivi) ?"
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

        <RadioGroup
          legend="Cette finalité est-elle explicite, déterminée et légitime ?"
          inline
          options={[
            { value: 'oui', label: 'Oui' },
            { value: 'non', label: 'Non' },
            { value: 'a_preciser', label: 'À préciser' },
          ]}
          value={reg.finalite_explicite}
          onChange={(v) => updatePart('registre', { finalite_explicite: v })}
        />

        <CheckboxGroup
          legend="Base légale du traitement (cocher la ou les bases applicables) :"
          options={[
            { value: 'consentement', label: 'Consentement de la personne concernée' },
            { value: 'obligation_legale', label: 'Obligation légale imposant le traitement' },
            { value: 'execution_contrat', label: "Exécution d'un contrat auquel la personne est partie" },
            { value: 'interet_legitime', label: 'Intérêt légitime du responsable de traitement' },
            { value: 'mission_interet_public', label: "Mission d'intérêt public ou exercice de l'autorité publique" },
            { value: 'sauvegarde_vie', label: 'Sauvegarde de la vie de la personne concernée' },
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
          options={[
            { value: 'automatise', label: 'Traitement automatisé (informatique)' },
            { value: 'manuel', label: 'Traitement manuel (papier)' },
            { value: 'mixte', label: 'Traitement mixte (automatisé + manuel)' },
          ]}
          value={reg.mode_traitement}
          onChange={(v) => updatePart('registre', { mode_traitement: v })}
        />

        <RadioGroup
          legend="Informez-vous les personnes concernées au moment de la collecte de leurs données ?"
          options={[
            { value: 'oui_systematiquement', label: 'Oui, systématiquement' },
            { value: 'parfois', label: 'Parfois' },
            { value: 'non', label: 'Non' },
          ]}
          value={reg.info_personnes_collecte}
          onChange={(v) => updatePart('registre', { info_personnes_collecte: v })}
        />

        <CheckboxGroup
          legend="Quelles informations communiquez-vous ? (cocher toutes les informations fournies)"
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

        <RadioGroup
          legend="Réutilisez-vous les données collectées pour des finalités autres que celles qui ont justifié leur collecte initiale ?"
          inline
          options={[{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }]}
          value={reg.reutilisation_donnees}
          onChange={(v) => updatePart('registre', { reutilisation_donnees: v })}
        />
      </FormSection>

      {/* ============================ PARTIE 4 ============================ */}
      <FormSection title="PARTIE 4 : SOUS-TRAITANCE, TRANSFERT DES DONNÉES">

        <RadioGroup
          legend="Avez-vous recours à des sous-traitants pour le traitement de données personnelles ?"
          inline
          options={[{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }]}
          value={st.recours_sous_traitants}
          onChange={(v) => updatePart('sous_traitance_transferts', { recours_sous_traitants: v })}
        />

        {st.recours_sous_traitants === 'oui' && (
          <>
            <RadioGroup
              legend="Avez-vous conclu des contrats de sous-traitance conformes à la loi avec chaque sous-traitant ?"
              options={[
                { value: 'oui_tous', label: 'Oui, tous les sous-traitants' },
                { value: 'oui_certains', label: 'Oui, certains seulement' },
                { value: 'non', label: 'Non' },
              ]}
              value={st.contrats_sous_traitance}
              onChange={(v) => updatePart('sous_traitance_transferts', { contrats_sous_traitance: v })}
            />
            {st.contrats_sous_traitance === 'oui_tous' && (
              <TextField label="Combien" type="number"
                value={st.contrats_nombre_tous}
                onChange={(v) => updatePart('sous_traitance_transferts', { contrats_nombre_tous: v })} />
            )}
            {st.contrats_sous_traitance === 'oui_certains' && (
              <TextField label="Combien" type="number"
                value={st.contrats_nombre_certains}
                onChange={(v) => updatePart('sous_traitance_transferts', { contrats_nombre_certains: v })} />
            )}

            <CheckboxGroup
              legend="Ces contrats comportent-ils les clauses obligatoires suivantes ?"
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

        <RadioGroup
          legend="Transférez-vous des données personnelles hors de l'espace CEDEAO ?"
          inline
          options={[{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }]}
          value={st.transfert_hors_cedeao}
          onChange={(v) => updatePart('sous_traitance_transferts', { transfert_hors_cedeao: v })}
        />

        {st.transfert_hors_cedeao === 'oui' && (
          <fieldset className="border border-gray-200 p-4 mb-4">
            <legend className="text-xs font-bold text-gray-700 px-2">Si oui</legend>
            {/* Spec 3.8 : multi-select pays de destination */}
            <div className="form-group">
              <label className="text-sm font-semibold">
                Pays de destination (plusieurs possibles, un par ligne)
              </label>
              <textarea
                rows={3}
                value={(st.pays_transferts ?? []).join('\n')}
                onChange={(e) => updatePart('sous_traitance_transferts', {
                  pays_transferts: e.target.value.split('\n').map((p) => p.trim()).filter(Boolean),
                })}
                placeholder="France&#10;États-Unis&#10;Canada&#10;..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Saisissez un pays par ligne. {(st.pays_transferts ?? []).length} pays sélectionné(s).
              </p>
            </div>
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
              <TextField label="N° d'autorisation"
                value={st.numero_autorisation_transfert}
                onChange={(v) => updatePart('sous_traitance_transferts', { numero_autorisation_transfert: v })} />
            )}
            <CheckboxGroup
              legend="Sur quelle base juridique repose le transfert ?"
              options={[
                { value: 'consentement_expres', label: 'Consentement exprès de la personne' },
                { value: 'execution_contrat', label: "Exécution d'un contrat" },
                { value: 'motif_interet_public', label: "Motif d'intérêt public" },
                { value: 'constatation_defense_droits', label: 'Constatation, exercice ou défense de droits en justice' },
                { value: 'sauvegarde_vie', label: 'Sauvegarde de la vie de la personne' },
                { value: 'garanties_appropriees', label: 'Garanties appropriées (préciser)' },
              ] satisfies { value: BaseJuridiqueTransfert; label: string }[] as { value: BaseJuridiqueTransfert; label: string }[]}
              values={st.bases_juridiques_transfert ?? []}
              onChange={(v) => updatePart('sous_traitance_transferts', { bases_juridiques_transfert: v })}
            />
            {st.bases_juridiques_transfert?.includes('garanties_appropriees') && (
              <TextField label="Préciser les garanties appropriées"
                value={st.garanties_appropriees_precision}
                onChange={(v) => updatePart('sous_traitance_transferts', { garanties_appropriees_precision: v })} />
            )}
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

        <RadioGroup
          legend="À l'issue de la durée de conservation, procédez-vous à la suppression ou l'anonymisation des données ?"
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

        <RadioGroup
          legend="Les supports de stockage envoyés en réparation ou à la destruction font-ils l'objet d'une procédure de protection (effacement sécurisé) ?"
          options={[
            { value: 'oui_documentee', label: 'Oui, procédure documentée' },
            { value: 'non', label: 'Non' },
            { value: 'non_applicable', label: 'Non applicable' },
          ]}
          value={st.protection_supports}
          onChange={(v) => updatePart('sous_traitance_transferts', { protection_supports: v })}
        />
      </FormSection>

      {/* ============================ PARTIE 5 ============================ */}
      <FormSection title="PARTIE 5 : SÉCURITÉ ET FORMATION">

        <RadioGroup
          legend="Avez-vous mis en place une charte de protection des données personnelles ?"
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
            <p className="text-xs font-semibold text-gray-800 mb-2">
              Upload de la Charte de protection des données <span className="text-red-500">*</span>
            </p>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => updatePart('securite', { charte_uploaded: !!e.target.files?.[0] })}
              className="text-xs"
            />
            {sec.charte_uploaded && <p className="text-xs text-green-600 mt-1">✓ Document sélectionné</p>}
          </div>
        )}

        {/* Spec 3.9 : Mesures techniques en multi-select */}
        <CheckboxGroup
          legend="Quelles mesures techniques de sécurité sont mises en place ? (cocher toutes les options applicables)"
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

        <RadioGroup
          legend="Avez-vous subi une violation de données personnelles (fuite, perte, accès non autorisé, etc.) au cours des 12 derniers mois ?"
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

        <RadioGroup
          legend="Tenez-vous un registre/inventaire des violations de données ?"
          inline
          options={[{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }]}
          value={sec.registre_violations}
          onChange={(v) => updatePart('securite', { registre_violations: v })}
        />

        <RadioGroup
          legend="Avez-vous défini des procédures de réaction et de remontée d'informations en cas de violation ?"
          options={[
            { value: 'oui_documentee_testee', label: 'Oui, procédure documentée et testée' },
            { value: 'oui_documentee_non_testee', label: 'Oui, procédure documentée mais non testée' },
            { value: 'informelle', label: 'Procédure informelle' },
            { value: 'non', label: 'Non' },
          ]}
          value={sec.procedures_violation}
          onChange={(v) => updatePart('securite', { procedures_violation: v })}
        />

        <RadioGroup
          legend="Les personnels sont-ils sensibilisés/formés à la protection des données ?"
          options={[
            { value: 'oui_formation_initiale', label: 'Oui, formation initiale obligatoire' },
            { value: 'oui_sensibilisation_periodique', label: 'Oui, sensibilisations périodiques' },
            { value: 'formation_ponctuelle', label: 'Formation ponctuelle' },
            { value: 'non', label: 'Non' },
          ]}
          value={sec.personnel_sensibilise}
          onChange={(v) => updatePart('securite', { personnel_sensibilise: v })}
        />

        {(sec.personnel_sensibilise === 'oui_formation_initiale'
          || sec.personnel_sensibilise === 'oui_sensibilisation_periodique'
          || sec.personnel_sensibilise === 'formation_ponctuelle') && (
          <RadioGroup
            legend="Si oui, quelle est la fréquence des formations ?"
            inline
            options={[
              { value: 'reguliere', label: 'Régulière' },
              { value: 'ponctuelle', label: 'Ponctuelle' },
              { value: 'aucune', label: 'Aucune' },
            ]}
            value={sec.frequence_formations}
            onChange={(v) => updatePart('securite', { frequence_formations: v })}
          />
        )}
      </FormSection>

      </div>

      {/* ============================ ACTIONS ============================ */}
      {!isReadOnly && (
        <>
          <div className="alert alert-warning mb-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong>Vérifiez l'exactitude de toutes vos réponses avant de soumettre.</strong>
              <br />
              Une fois soumis, votre dossier sera examiné par les services de l'ARTCI.
              <strong> Après envoi, il n'y aura plus de possibilité de modification.</strong>
            </div>
          </div>

          {showSubmitConfirm && (
            <div className="alert alert-danger mb-4">
              <strong>Confirmer la soumission définitive ?</strong>
              <p className="text-sm my-2">
                Cette action est irréversible. Vous ne pourrez plus modifier votre dossier
                avant retour de l'ARTCI.
              </p>
              <div className="flex gap-2">
                <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary text-sm">
                  Oui, soumettre définitivement
                </button>
                <button onClick={() => setShowSubmitConfirm(false)} className="btn btn-outline text-sm">
                  Annuler
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-outline flex items-center gap-2"
            >
              {saving ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <Save className="w-4 h-4" />}
              Sauvegarder le brouillon
            </button>
            <button
              onClick={() => setShowSubmitConfirm(true)}
              disabled={submitting || showSubmitConfirm}
              className="btn btn-primary flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Soumettre définitivement à l'ARTCI
            </button>
          </div>
        </>
      )}
    </div>
  );
}
