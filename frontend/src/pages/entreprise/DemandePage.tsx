import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Send, Plus, Trash2 } from 'lucide-react';
import FormStepper from '@/components/entreprise/FormStepper';
import Loading from '@/components/common/Loading';
import * as entrepriseApi from '@/api/entreprise.api';
import { useApi } from '@/hooks/useApi';
import { ROUTES } from '@/utils/constants';
import type {
  DemandeInput, ResponsableLegal, DPO, ConformiteAdministrative,
  RegistreTraitement, FinaliteBaseLegale, SousTraitance,
  TransfertInternational, MesureSecurite, CertificationSecurite,
  CategorieDonneesItem,
} from '@/types/entreprise';

const DRAFT_KEY = 'demande_draft';

function getEmptyForm(): DemandeInput {
  return {
    denomination: '', numero_cc: '', forme_juridique: '', secteur_activite: '',
    adresse: '', ville: '', region: '', telephone: '', email: '',
    contact: {}, localisation: {}, responsables_legaux: [],
    dpos: [], conformites_administratives: [],
    registre_traitements: [], categories_donnees: [], finalites: [],
    sous_traitants: [], transferts: [],
    securite: {}, mesures_securite: [], certifications: [],
  };
}

export default function DemandePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<DemandeInput>(getEmptyForm);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [entiteId, setEntiteId] = useState<string | null>(id ?? null);

  // Load existing demande if editing
  const { data: existingDossier, isLoading } = useApi(
    () => id ? entrepriseApi.getMonDossier() : Promise.resolve(null),
    [id]
  );

  // Init form from existing data or localStorage draft
  useEffect(() => {
    if (existingDossier) {
      setFormData({
        denomination: existingDossier.denomination ?? '',
        numero_cc: existingDossier.numero_cc ?? '',
        forme_juridique: existingDossier.forme_juridique ?? '',
        secteur_activite: existingDossier.secteur_activite ?? '',
        adresse: existingDossier.adresse ?? '',
        ville: existingDossier.ville ?? '',
        region: existingDossier.region ?? '',
        telephone: existingDossier.telephone ?? '',
        email: existingDossier.email ?? '',
        contact: existingDossier.contact ?? {},
        localisation: existingDossier.localisation ?? {},
        responsables_legaux: existingDossier.responsables_legaux ?? [],
        dpos: existingDossier.dpos ?? [],
        conformites_administratives: existingDossier.conformites_administratives ?? [],
        registre_traitements: existingDossier.registre_traitements ?? [],
        categories_donnees: existingDossier.categories_donnees ?? [],
        finalites: existingDossier.finalites ?? [],
        sous_traitants: existingDossier.sous_traitants ?? [],
        transferts: existingDossier.transferts ?? [],
        securite: existingDossier.securite ?? {},
        mesures_securite: existingDossier.mesures_securite ?? [],
        certifications: existingDossier.certifications ?? [],
      });
      setEntiteId(existingDossier.id);
    } else if (!id) {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        try { setFormData(JSON.parse(draft)); } catch { /* ignore */ }
      }
    }
  }, [existingDossier, id]);

  // Auto-save draft every 30s
  useEffect(() => {
    if (id) return;
    const timer = setInterval(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
    }, 30000);
    return () => clearInterval(timer);
  }, [formData, id]);

  function updateField(key: keyof DemandeInput, value: unknown) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function updateNestedField(parent: 'contact' | 'localisation' | 'securite', key: string, value: unknown) {
    setFormData((prev) => ({
      ...prev,
      [parent]: { ...((prev[parent] as Record<string, unknown>) ?? {}), [key]: value },
    }));
  }

  const addToList = useCallback(<T,>(key: keyof DemandeInput, item: T) => {
    setFormData((prev) => ({
      ...prev,
      [key]: [...((prev[key] as T[]) ?? []), item],
    }));
  }, []);

  const removeFromList = useCallback((key: keyof DemandeInput, index: number) => {
    setFormData((prev) => ({
      ...prev,
      [key]: ((prev[key] as unknown[]) ?? []).filter((_, i) => i !== index),
    }));
  }, []);

  const updateListItem = useCallback(<T,>(key: keyof DemandeInput, index: number, field: keyof T, value: unknown) => {
    setFormData((prev) => {
      const list = [...((prev[key] as T[]) ?? [])];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, [key]: list };
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (entiteId) {
        await entrepriseApi.updateDemande(entiteId, formData);
      } else {
        const result = await entrepriseApi.createDemande(formData);
        setEntiteId(result.id);
        localStorage.removeItem(DRAFT_KEY);
      }
      setSuccess('Demande sauvegardée avec succès.');
    } catch {
      setError('Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!entiteId) {
      setError('Veuillez d\'abord sauvegarder votre demande.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await entrepriseApi.soumettreDemande(entiteId);
      localStorage.removeItem(DRAFT_KEY);
      navigate(ROUTES.ENTREPRISE_DASHBOARD, { replace: true });
    } catch {
      setError('Erreur lors de la soumission. Vérifiez que tous les champs requis sont remplis.');
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return <Loading fullPage text="Chargement de la demande..." />;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl mb-2">{id ? 'Modifier ma Demande' : 'Nouvelle Demande'}</h1>
      <p className="text-sm text-gray-500 mb-4">
        Questionnaire de recensement et d'évaluation de la conformité à la Loi N°2013-450
      </p>

      {error && <div className="alert alert-danger mb-4">{error}</div>}
      {success && <div className="alert alert-success mb-4">{success}</div>}

      <FormStepper currentStep={currentStep} onStepClick={setCurrentStep} />

      <div className="card mt-6">
        {currentStep === 1 && (
          <Partie1Identification
            formData={formData}
            updateField={updateField}
            updateNestedField={updateNestedField}
            addToList={addToList}
            removeFromList={removeFromList}
            updateListItem={updateListItem}
          />
        )}
        {currentStep === 2 && (
          <Partie2CadreJuridique
            formData={formData}
            addToList={addToList}
            removeFromList={removeFromList}
            updateListItem={updateListItem}
          />
        )}
        {currentStep === 3 && (
          <Partie3Registre
            formData={formData}
            addToList={addToList}
            removeFromList={removeFromList}
            updateListItem={updateListItem}
          />
        )}
        {currentStep === 4 && (
          <Partie4SousTraitance
            formData={formData}
            addToList={addToList}
            removeFromList={removeFromList}
            updateListItem={updateListItem}
          />
        )}
        {currentStep === 5 && (
          <Partie5Securite
            formData={formData}
            updateNestedField={updateNestedField}
            addToList={addToList}
            removeFromList={removeFromList}
            updateListItem={updateListItem}
          />
        )}
      </div>

      {/* Navigation + Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6">
        <div className="flex gap-2">
          {currentStep > 1 && (
            <button className="btn btn-outline" onClick={() => setCurrentStep(currentStep - 1)}>
              Précédent
            </button>
          )}
          {currentStep < 5 && (
            <button className="btn btn-primary" onClick={() => setCurrentStep(currentStep + 1)}>
              Suivant
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-outline flex items-center gap-2"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <Save className="w-4 h-4" />}
            Sauvegarder
          </button>
          {currentStep === 5 && (
            <button
              className="btn btn-secondary flex items-center gap-2"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <Send className="w-4 h-4" />}
              Soumettre
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PARTIE 1 : IDENTIFICATION DE L'ENTITÉ
// ============================================================
function Partie1Identification({
  formData,
  updateField,
  updateNestedField,
  addToList,
  removeFromList,
  updateListItem,
}: {
  formData: DemandeInput;
  updateField: (key: keyof DemandeInput, value: unknown) => void;
  updateNestedField: (p: 'contact' | 'localisation', k: string, v: unknown) => void;
  addToList: <T>(key: keyof DemandeInput, item: T) => void;
  removeFromList: (key: keyof DemandeInput, index: number) => void;
  updateListItem: <T>(key: keyof DemandeInput, i: number, field: keyof T, v: unknown) => void;
}) {
  const c = formData.contact ?? {};
  const loc = formData.localisation ?? {};

  return (
    <div>
      <h3 className="text-lg font-bold mb-4">Partie 1 — Identification de l'entité</h3>

      {/* Q1 — Statut juridique */}
      <div className="form-group mb-4">
        <label className="font-semibold text-sm">1. Statut juridique de l'entité *</label>
        <select value={formData.forme_juridique ?? ''} onChange={(e) => updateField('forme_juridique', e.target.value)}>
          <option value="">Sélectionnez...</option>
          <optgroup label="Personne morale de droit privé">
            <option value="Société Anonyme (SA)">Société Anonyme (SA)</option>
            <option value="SARL">SARL</option>
            <option value="SAS">SAS</option>
            <option value="Association">Association</option>
            <option value="Autre société privée">Autre société privée</option>
          </optgroup>
          <optgroup label="Personne morale de droit public">
            <option value="Administration publique">Administration publique</option>
            <option value="Établissement public">Établissement public</option>
            <option value="Collectivité territoriale">Collectivité territoriale</option>
          </optgroup>
          <option value="Entreprise Individuelle">Personne physique (Entrepreneur individuel)</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="form-group">
          <label>Dénomination / Raison sociale *</label>
          <input type="text" value={formData.denomination} onChange={(e) => updateField('denomination', e.target.value)} required />
        </div>
        <div className="form-group">
          <label>N° Compte Contribuable *</label>
          <input type="text" value={formData.numero_cc} onChange={(e) => updateField('numero_cc', e.target.value)} required />
        </div>

        {/* Q2 — Secteur d'activité */}
        <div className="form-group">
          <label className="font-semibold text-sm">2. Secteur d'activité *</label>
          <select value={formData.secteur_activite ?? ''} onChange={(e) => updateField('secteur_activite', e.target.value)}>
            <option value="">Sélectionnez...</option>
            <option value="Télécommunications">Télécommunications / TIC</option>
            <option value="Banque / Finance">Banque / Finance / Assurance</option>
            <option value="Santé">Santé</option>
            <option value="Éducation">Éducation</option>
            <option value="Commerce">Commerce / Services</option>
            <option value="Industrie">Industrie</option>
            <option value="Transport">Transport</option>
            <option value="Autre">Autre</option>
          </select>
        </div>

        <div className="form-group">
          <label>Téléphone</label>
          <input type="tel" value={formData.telephone ?? ''} onChange={(e) => updateField('telephone', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={formData.email ?? ''} onChange={(e) => updateField('email', e.target.value)} />
        </div>

        <div className="form-group sm:col-span-2">
          <label>Adresse</label>
          <input type="text" value={formData.adresse ?? ''} onChange={(e) => updateField('adresse', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Ville</label>
          <input type="text" value={formData.ville ?? ''} onChange={(e) => updateField('ville', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Région</label>
          <input type="text" value={formData.region ?? ''} onChange={(e) => updateField('region', e.target.value)} />
        </div>
      </div>

      {/* Q3 — Responsable légal */}
      <h4 className="font-semibold mt-6 mb-3">3. Responsable légal de l'organisation</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="form-group">
          <label>Nom et prénom(s)</label>
          <input type="text" value={c.responsable_legal_nom ?? ''} onChange={(e) => updateNestedField('contact', 'responsable_legal_nom', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Fonction</label>
          <input type="text" value={c.responsable_legal_fonction ?? ''} onChange={(e) => updateNestedField('contact', 'responsable_legal_fonction', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={c.responsable_legal_email ?? ''} onChange={(e) => updateNestedField('contact', 'responsable_legal_email', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Téléphone</label>
          <input type="tel" value={c.responsable_legal_telephone ?? ''} onChange={(e) => updateNestedField('contact', 'responsable_legal_telephone', e.target.value)} />
        </div>
        <div className="form-group sm:col-span-2">
          <label>Site web</label>
          <input type="url" value={c.site_web ?? ''} onChange={(e) => updateNestedField('contact', 'site_web', e.target.value)} />
        </div>
      </div>

      {/* Responsables légaux supplémentaires */}
      {(formData.responsables_legaux ?? []).length > 0 && (
        <div className="mb-4">
          <h4 className="font-semibold mb-2 text-sm">Responsables légaux supplémentaires</h4>
          {(formData.responsables_legaux ?? []).map((rl, i) => (
            <div key={i} className="p-3 bg-gray-50 rounded mb-3 relative">
              <button className="absolute top-2 right-2 text-red-400 hover:text-red-600" onClick={() => removeFromList('responsables_legaux', i)}>
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="form-group mb-2">
                  <label className="text-xs">Nom *</label>
                  <input type="text" value={rl.nom} onChange={(e) => updateListItem<ResponsableLegal>('responsables_legaux', i, 'nom', e.target.value)} />
                </div>
                <div className="form-group mb-2">
                  <label className="text-xs">Prénom</label>
                  <input type="text" value={rl.prenom ?? ''} onChange={(e) => updateListItem<ResponsableLegal>('responsables_legaux', i, 'prenom', e.target.value)} />
                </div>
                <div className="form-group mb-2">
                  <label className="text-xs">Fonction</label>
                  <input type="text" value={rl.fonction ?? ''} onChange={(e) => updateListItem<ResponsableLegal>('responsables_legaux', i, 'fonction', e.target.value)} />
                </div>
                <div className="form-group mb-2">
                  <label className="text-xs">Email</label>
                  <input type="email" value={rl.email ?? ''} onChange={(e) => updateListItem<ResponsableLegal>('responsables_legaux', i, 'email', e.target.value)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <button className="btn btn-outline text-sm py-2 flex items-center gap-1 mb-6" onClick={() => addToList<ResponsableLegal>('responsables_legaux', { nom: '' })}>
        <Plus className="w-4 h-4" /> Ajouter un responsable légal
      </button>

      {/* Localisation GPS */}
      <h4 className="font-semibold mb-3">Localisation GPS</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="form-group">
          <label>Latitude</label>
          <input type="number" step="any" value={loc.latitude ?? ''} onChange={(e) => updateNestedField('localisation', 'latitude', e.target.value ? parseFloat(e.target.value) : undefined)} />
        </div>
        <div className="form-group">
          <label>Longitude</label>
          <input type="number" step="any" value={loc.longitude ?? ''} onChange={(e) => updateNestedField('localisation', 'longitude', e.target.value ? parseFloat(e.target.value) : undefined)} />
        </div>
        <div className="form-group sm:col-span-2">
          <label>Adresse complète</label>
          <input type="text" value={loc.adresse_complete ?? ''} onChange={(e) => updateNestedField('localisation', 'adresse_complete', e.target.value)} />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PARTIE 2 : CADRE JURIDIQUE ET CONFORMITÉ ADMINISTRATIVE
// ============================================================
function Partie2CadreJuridique({
  formData,
  addToList,
  removeFromList,
  updateListItem,
}: {
  formData: DemandeInput;
  addToList: <T>(key: keyof DemandeInput, item: T) => void;
  removeFromList: (key: keyof DemandeInput, index: number) => void;
  updateListItem: <T>(key: keyof DemandeInput, i: number, field: keyof T, v: unknown) => void;
}) {
  // State for conditional questions
  const ca = (formData.conformites_administratives ?? [])[0] ?? {};
  const hasDpo = (formData.dpos ?? []).length > 0;

  // Ensure at least one conformité entry exists
  function ensureCA() {
    if ((formData.conformites_administratives ?? []).length === 0) {
      addToList<ConformiteAdministrative>('conformites_administratives', {});
    }
  }

  function updateCA(field: keyof ConformiteAdministrative, value: unknown) {
    ensureCA();
    if ((formData.conformites_administratives ?? []).length > 0) {
      updateListItem<ConformiteAdministrative>('conformites_administratives', 0, field, value);
    }
  }

  return (
    <div>
      <h3 className="text-lg font-bold mb-4">Partie 2 — Cadre juridique et conformité administrative</h3>

      {/* Q4 — Connaissance loi */}
      <div className="space-y-4 mb-6">
        <div className="p-4 bg-gray-50 rounded">
          <label className="font-semibold text-sm block mb-2">
            4. Connaissez-vous l'existence de la loi N°2013-450 relative à la protection des données à caractère personnel ?
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="connaissance_loi" checked={ca.connaissance_loi_2013 === true} onChange={() => updateCA('connaissance_loi_2013', true)} />
              Oui
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="connaissance_loi" checked={ca.connaissance_loi_2013 === false} onChange={() => updateCA('connaissance_loi_2013', false)} />
              Non
            </label>
          </div>
        </div>

        {/* Q5 — DPO désigné */}
        <div className="p-4 bg-gray-50 rounded">
          <label className="font-semibold text-sm block mb-2">
            5. Avez-vous désigné un Correspondant à la Protection des Données (DPO/CPD) ?
          </label>
          <div className="flex gap-4 mb-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="has_dpo" checked={hasDpo} onChange={() => {
                if (!hasDpo) addToList<DPO>('dpos', { nom: '', type: 'interne' });
              }} />
              Oui, désigné
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="has_dpo" checked={!hasDpo} onChange={() => {
                // Remove all DPOs
                while ((formData.dpos ?? []).length > 0) removeFromList('dpos', 0);
              }} />
              Non
            </label>
          </div>

          {/* Conditionnel : Si DPO = Oui → Coordonnées DPO */}
          {hasDpo && (
            <div className="border-l-4 border-[var(--artci-orange)] pl-4 mt-3 space-y-4">
              <p className="text-xs text-gray-500 font-semibold">Coordonnées du CPD/DPO :</p>
              {(formData.dpos ?? []).map((dpo, i) => (
                <div key={i} className="p-3 bg-white rounded border relative">
                  {i > 0 && (
                    <button className="absolute top-2 right-2 text-red-400 hover:text-red-600" onClick={() => removeFromList('dpos', i)}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="form-group mb-2">
                      <label className="text-xs">Nom *</label>
                      <input type="text" value={dpo.nom} onChange={(e) => updateListItem<DPO>('dpos', i, 'nom', e.target.value)} />
                    </div>
                    <div className="form-group mb-2">
                      <label className="text-xs">Prénom</label>
                      <input type="text" value={dpo.prenom ?? ''} onChange={(e) => updateListItem<DPO>('dpos', i, 'prenom', e.target.value)} />
                    </div>
                    <div className="form-group mb-2">
                      <label className="text-xs">Email professionnel</label>
                      <input type="email" value={dpo.email ?? ''} onChange={(e) => updateListItem<DPO>('dpos', i, 'email', e.target.value)} />
                    </div>
                    <div className="form-group mb-2">
                      <label className="text-xs">Téléphone</label>
                      <input type="tel" value={dpo.telephone ?? ''} onChange={(e) => updateListItem<DPO>('dpos', i, 'telephone', e.target.value)} />
                    </div>
                    <div className="form-group mb-2">
                      <label className="text-xs">Date de désignation</label>
                      <input type="date" value={dpo.date_designation ?? ''} onChange={(e) => updateListItem<DPO>('dpos', i, 'date_designation', e.target.value)} />
                    </div>
                    <div className="form-group mb-2">
                      <label className="text-xs">Le CPD est-il :</label>
                      <select value={dpo.type} onChange={(e) => updateListItem<DPO>('dpos', i, 'type', e.target.value)}>
                        <option value="interne">Interne à l'organisation</option>
                        <option value="externe">Externe (prestataire)</option>
                      </select>
                    </div>
                    {dpo.type === 'externe' && (
                      <div className="form-group mb-2 sm:col-span-2">
                        <label className="text-xs">Organisme du prestataire</label>
                        <input type="text" value={dpo.organisme ?? ''} onChange={(e) => updateListItem<DPO>('dpos', i, 'organisme', e.target.value)} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <button className="btn btn-outline text-xs py-1.5 flex items-center gap-1" onClick={() => addToList<DPO>('dpos', { nom: '', type: 'interne' })}>
                <Plus className="w-3 h-3" /> Ajouter un autre DPO
              </button>
            </div>
          )}
        </div>

        {/* Q6 — Déclaration / Autorisation ARTCI */}
        <div className="p-4 bg-gray-50 rounded">
          <label className="font-semibold text-sm block mb-2">
            6. Avez-vous effectué une déclaration auprès de l'ARTCI ?
          </label>
          <div className="flex gap-4 mb-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="declaration_artci" checked={ca.declaration_artci === true} onChange={() => updateCA('declaration_artci', true)} />
              Oui
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="declaration_artci" checked={ca.declaration_artci === false} onChange={() => updateCA('declaration_artci', false)} />
              Non
            </label>
          </div>

          {/* Conditionnel : Si déclaration = Oui → Détails */}
          {ca.declaration_artci && (
            <div className="border-l-4 border-[var(--artci-green)] pl-4 mt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="form-group mb-2">
                  <label className="text-xs">N° de déclaration</label>
                  <input type="text" value={ca.numero_declaration ?? ''} onChange={(e) => updateCA('numero_declaration', e.target.value)} />
                </div>
                <div className="form-group mb-2">
                  <label className="text-xs">Date de déclaration</label>
                  <input type="date" value={ca.date_declaration ?? ''} onChange={(e) => updateCA('date_declaration', e.target.value)} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Q7 — Autorisation */}
        <div className="p-4 bg-gray-50 rounded">
          <label className="font-semibold text-sm block mb-2">
            7. Avez-vous obtenu une autorisation de l'ARTCI pour vos traitements ?
          </label>
          <div className="flex gap-4 mb-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="autorisation_artci" checked={ca.autorisation_artci === true} onChange={() => updateCA('autorisation_artci', true)} />
              Oui
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="autorisation_artci" checked={ca.autorisation_artci === false} onChange={() => updateCA('autorisation_artci', false)} />
              Non
            </label>
          </div>

          {/* Conditionnel : Si autorisation = Oui → Détails */}
          {ca.autorisation_artci && (
            <div className="border-l-4 border-[var(--artci-green)] pl-4 mt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="form-group mb-2">
                  <label className="text-xs">N° d'autorisation</label>
                  <input type="text" value={ca.numero_autorisation ?? ''} onChange={(e) => updateCA('numero_autorisation', e.target.value)} />
                </div>
                <div className="form-group mb-2">
                  <label className="text-xs">Date d'autorisation</label>
                  <input type="date" value={ca.date_autorisation ?? ''} onChange={(e) => updateCA('date_autorisation', e.target.value)} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PARTIE 3 : REGISTRE ET CARTOGRAPHIE DES TRAITEMENTS
// ============================================================
function Partie3Registre({
  formData,
  addToList,
  removeFromList,
  updateListItem,
}: {
  formData: DemandeInput;
  addToList: <T>(key: keyof DemandeInput, item: T) => void;
  removeFromList: (key: keyof DemandeInput, index: number) => void;
  updateListItem: <T>(key: keyof DemandeInput, i: number, field: keyof T, v: unknown) => void;
}) {
  const hasRegistre = (formData.registre_traitements ?? []).length > 0;

  return (
    <div>
      <h3 className="text-lg font-bold mb-4">Partie 3 — Registre et cartographie des traitements</h3>

      {/* Q8 — Registre des traitements */}
      <div className="p-4 bg-gray-50 rounded mb-4">
        <label className="font-semibold text-sm block mb-2">
          8. Disposez-vous d'un registre des activités de traitement tenu à jour ?
        </label>
        <div className="flex gap-4 mb-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" name="has_registre" checked={hasRegistre} onChange={() => {
              if (!hasRegistre) addToList<RegistreTraitement>('registre_traitements', { nom_traitement: '' });
            }} />
            Oui
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" name="has_registre" checked={!hasRegistre} onChange={() => {
              while ((formData.registre_traitements ?? []).length > 0) removeFromList('registre_traitements', 0);
            }} />
            Non
          </label>
        </div>

        {/* Conditionnel : Si registre = Oui → Détails des traitements */}
        {hasRegistre && (
          <div className="border-l-4 border-[var(--artci-orange)] pl-4 mt-3 space-y-3">
            {(formData.registre_traitements ?? []).map((rt, i) => (
              <div key={i} className="p-3 bg-white rounded border relative">
                <button className="absolute top-2 right-2 text-red-400 hover:text-red-600" onClick={() => removeFromList('registre_traitements', i)}>
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="form-group mb-2">
                    <label className="text-xs">Nom du traitement *</label>
                    <input type="text" value={rt.nom_traitement} onChange={(e) => updateListItem<RegistreTraitement>('registre_traitements', i, 'nom_traitement', e.target.value)} />
                  </div>
                  <div className="form-group mb-2">
                    <label className="text-xs">Finalité</label>
                    <input type="text" value={rt.finalite ?? ''} onChange={(e) => updateListItem<RegistreTraitement>('registre_traitements', i, 'finalite', e.target.value)} />
                  </div>
                  <div className="form-group mb-2">
                    <label className="text-xs">Base légale</label>
                    <input type="text" value={rt.base_legale ?? ''} onChange={(e) => updateListItem<RegistreTraitement>('registre_traitements', i, 'base_legale', e.target.value)} />
                  </div>
                  <div className="form-group mb-2">
                    <label className="text-xs">Catégories de personnes</label>
                    <input type="text" value={rt.categories_personnes ?? ''} onChange={(e) => updateListItem<RegistreTraitement>('registre_traitements', i, 'categories_personnes', e.target.value)} placeholder="Ex: Salariés, Clients, Usagers..." />
                  </div>
                  <div className="form-group mb-2">
                    <label className="text-xs">Durée de conservation</label>
                    <input type="text" value={rt.duree_conservation ?? ''} onChange={(e) => updateListItem<RegistreTraitement>('registre_traitements', i, 'duree_conservation', e.target.value)} />
                  </div>
                  <div className="form-group mb-2">
                    <label className="text-xs">Destinataires</label>
                    <input type="text" value={rt.destinataires ?? ''} onChange={(e) => updateListItem<RegistreTraitement>('registre_traitements', i, 'destinataires', e.target.value)} />
                  </div>
                  <div className="form-group mb-2 sm:col-span-2">
                    <label className="text-xs">Description</label>
                    <textarea value={rt.description ?? ''} rows={2} onChange={(e) => updateListItem<RegistreTraitement>('registre_traitements', i, 'description', e.target.value)} />
                  </div>
                  <div className="form-group mb-2 sm:col-span-2">
                    <label className="text-xs flex items-center gap-2">
                      <input type="checkbox" checked={rt.transfert_hors_ci ?? false} onChange={(e) => updateListItem<RegistreTraitement>('registre_traitements', i, 'transfert_hors_ci', e.target.checked)} />
                      Transfert hors de Côte d'Ivoire
                    </label>
                  </div>
                </div>
              </div>
            ))}
            <button className="btn btn-outline text-xs py-1.5 flex items-center gap-1" onClick={() => addToList<RegistreTraitement>('registre_traitements', { nom_traitement: '' })}>
              <Plus className="w-3 h-3" /> Ajouter un traitement
            </button>
          </div>
        )}
      </div>

      {/* Q9 — Catégories de données */}
      <div className="p-4 bg-gray-50 rounded mb-4">
        <label className="font-semibold text-sm block mb-2">
          9. Quelles catégories de données traitez-vous ?
        </label>
        <p className="text-xs text-gray-500 mb-3">Cochez toutes les options applicables</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          {[
            { value: 'identite', label: 'Identité (nom, prénom, date de naissance...)' },
            { value: 'contact', label: 'Coordonnées (adresse, email, téléphone)' },
            { value: 'financieres', label: 'Données financières (comptes, revenus)' },
            { value: 'sante', label: 'Données de santé' },
            { value: 'biometriques', label: 'Données biométriques' },
            { value: 'localisation', label: 'Données de localisation' },
            { value: 'professionnelles', label: 'Données professionnelles' },
            { value: 'sensibles', label: 'Données sensibles (opinions, religion...)' },
            { value: 'mineurs', label: 'Données de mineurs' },
            { value: 'autre', label: 'Autre' },
          ].map(({ value, label }) => {
            const exists = (formData.categories_donnees ?? []).some(c => c.categorie === value);
            return (
              <label key={value} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={exists}
                  onChange={(e) => {
                    if (e.target.checked) {
                      addToList<CategorieDonneesItem>('categories_donnees', { categorie: value });
                    } else {
                      const idx = (formData.categories_donnees ?? []).findIndex(c => c.categorie === value);
                      if (idx >= 0) removeFromList('categories_donnees', idx);
                    }
                  }}
                />
                {label}
              </label>
            );
          })}
        </div>
      </div>

      {/* Q10 — Finalités & bases légales */}
      <div className="p-4 bg-gray-50 rounded mb-4">
        <label className="font-semibold text-sm block mb-2">
          10. Finalités de traitement et bases légales
        </label>
        <div className="space-y-3">
          {(formData.finalites ?? []).map((f, i) => (
            <div key={i} className="p-3 bg-white rounded border relative">
              <button className="absolute top-2 right-2 text-red-400 hover:text-red-600" onClick={() => removeFromList('finalites', i)}>
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="form-group mb-2">
                  <label className="text-xs">Finalité *</label>
                  <select value={f.finalite} onChange={(e) => updateListItem<FinaliteBaseLegale>('finalites', i, 'finalite', e.target.value)}>
                    <option value="">Sélectionnez...</option>
                    <option value="Gestion administrative">Gestion administrative</option>
                    <option value="Gestion des ressources humaines">Gestion RH</option>
                    <option value="Gestion de la clientèle">Gestion clientèle / usagers</option>
                    <option value="Marketing / prospection">Marketing / prospection</option>
                    <option value="Suivi médical / social">Suivi médical / social</option>
                    <option value="Recherche / statistiques">Recherche / statistiques</option>
                    <option value="Sécurité / contrôle d'accès">Sécurité / contrôle d'accès</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
                <div className="form-group mb-2">
                  <label className="text-xs">Base légale *</label>
                  <select value={f.base_legale} onChange={(e) => updateListItem<FinaliteBaseLegale>('finalites', i, 'base_legale', e.target.value)}>
                    <option value="">Sélectionnez...</option>
                    <option value="consentement">Consentement de la personne</option>
                    <option value="contrat">Exécution d'un contrat</option>
                    <option value="obligation_legale">Obligation légale</option>
                    <option value="interet_vital">Sauvegarde de la vie</option>
                    <option value="mission_publique">Mission d'intérêt public</option>
                    <option value="interet_legitime">Intérêt légitime</option>
                  </select>
                </div>
                <div className="form-group mb-2">
                  <label className="text-xs">Pourcentage (%)</label>
                  <input type="number" min={0} max={100} value={f.pourcentage ?? ''} onChange={(e) => updateListItem<FinaliteBaseLegale>('finalites', i, 'pourcentage', e.target.value ? parseInt(e.target.value) : undefined)} />
                </div>
              </div>
            </div>
          ))}
          <button className="btn btn-outline text-xs py-1.5 flex items-center gap-1" onClick={() => addToList<FinaliteBaseLegale>('finalites', { finalite: '', base_legale: '' })}>
            <Plus className="w-3 h-3" /> Ajouter une finalité
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PARTIE 4 : SOUS-TRAITANCE ET TRANSFERTS
// ============================================================
function Partie4SousTraitance({
  formData,
  addToList,
  removeFromList,
  updateListItem,
}: {
  formData: DemandeInput;
  addToList: <T>(key: keyof DemandeInput, item: T) => void;
  removeFromList: (key: keyof DemandeInput, index: number) => void;
  updateListItem: <T>(key: keyof DemandeInput, i: number, field: keyof T, v: unknown) => void;
}) {
  const hasSousTraitants = (formData.sous_traitants ?? []).length > 0;
  const hasTransferts = (formData.transferts ?? []).length > 0;

  return (
    <div>
      <h3 className="text-lg font-bold mb-4">Partie 4 — Sous-traitance et transferts de données</h3>

      {/* Q11 — Sous-traitants */}
      <div className="p-4 bg-gray-50 rounded mb-4">
        <label className="font-semibold text-sm block mb-2">
          11. Avez-vous recours à des sous-traitants pour le traitement de données personnelles ?
        </label>
        <div className="flex gap-4 mb-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" name="has_st" checked={hasSousTraitants} onChange={() => {
              if (!hasSousTraitants) addToList<SousTraitance>('sous_traitants', { nom_sous_traitant: '' });
            }} />
            Oui
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" name="has_st" checked={!hasSousTraitants} onChange={() => {
              while ((formData.sous_traitants ?? []).length > 0) removeFromList('sous_traitants', 0);
            }} />
            Non
          </label>
        </div>

        {/* Conditionnel : Si sous-traitants = Oui → Détails + clauses */}
        {hasSousTraitants && (
          <div className="border-l-4 border-[var(--artci-orange)] pl-4 mt-3 space-y-3">
            {(formData.sous_traitants ?? []).map((st, i) => (
              <div key={i} className="p-3 bg-white rounded border relative">
                <button className="absolute top-2 right-2 text-red-400 hover:text-red-600" onClick={() => removeFromList('sous_traitants', i)}>
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="form-group mb-2">
                    <label className="text-xs">Nom du sous-traitant *</label>
                    <input type="text" value={st.nom_sous_traitant} onChange={(e) => updateListItem<SousTraitance>('sous_traitants', i, 'nom_sous_traitant', e.target.value)} />
                  </div>
                  <div className="form-group mb-2">
                    <label className="text-xs">Pays</label>
                    <input type="text" value={st.pays ?? ''} onChange={(e) => updateListItem<SousTraitance>('sous_traitants', i, 'pays', e.target.value)} />
                  </div>
                  <div className="form-group mb-2 sm:col-span-2">
                    <label className="text-xs">Type de données partagées</label>
                    <input type="text" value={st.type_donnees_partagees ?? ''} onChange={(e) => updateListItem<SousTraitance>('sous_traitants', i, 'type_donnees_partagees', e.target.value)} />
                  </div>
                  <div className="form-group mb-2">
                    <label className="text-xs flex items-center gap-2">
                      <input type="checkbox" checked={st.contrat_sous_traitance ?? false} onChange={(e) => updateListItem<SousTraitance>('sous_traitants', i, 'contrat_sous_traitance', e.target.checked)} />
                      Contrat de sous-traitance signé
                    </label>
                  </div>
                  <div className="form-group mb-2">
                    <label className="text-xs flex items-center gap-2">
                      <input type="checkbox" checked={st.clauses_protection ?? false} onChange={(e) => updateListItem<SousTraitance>('sous_traitants', i, 'clauses_protection', e.target.checked)} />
                      Clauses de protection des données
                    </label>
                  </div>
                  <div className="form-group mb-2">
                    <label className="text-xs flex items-center gap-2">
                      <input type="checkbox" checked={st.audit_sous_traitant ?? false} onChange={(e) => updateListItem<SousTraitance>('sous_traitants', i, 'audit_sous_traitant', e.target.checked)} />
                      Possibilité d'audit
                    </label>
                  </div>
                </div>
              </div>
            ))}
            <button className="btn btn-outline text-xs py-1.5 flex items-center gap-1" onClick={() => addToList<SousTraitance>('sous_traitants', { nom_sous_traitant: '' })}>
              <Plus className="w-3 h-3" /> Ajouter un sous-traitant
            </button>
          </div>
        )}
      </div>

      {/* Q12 — Transferts internationaux */}
      <div className="p-4 bg-gray-50 rounded mb-4">
        <label className="font-semibold text-sm block mb-2">
          12. Transférez-vous des données personnelles hors de l'espace CEDEAO ?
        </label>
        <div className="flex gap-4 mb-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" name="has_transferts" checked={hasTransferts} onChange={() => {
              if (!hasTransferts) addToList<TransfertInternational>('transferts', { pays_destination: '' });
            }} />
            Oui
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" name="has_transferts" checked={!hasTransferts} onChange={() => {
              while ((formData.transferts ?? []).length > 0) removeFromList('transferts', 0);
            }} />
            Non
          </label>
        </div>

        {/* Conditionnel : Si transferts = Oui → Détails */}
        {hasTransferts && (
          <div className="border-l-4 border-[var(--artci-orange)] pl-4 mt-3 space-y-3">
            {(formData.transferts ?? []).map((t, i) => (
              <div key={i} className="p-3 bg-white rounded border relative">
                <button className="absolute top-2 right-2 text-red-400 hover:text-red-600" onClick={() => removeFromList('transferts', i)}>
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="form-group mb-2">
                    <label className="text-xs">Pays de destination *</label>
                    <input type="text" value={t.pays_destination} onChange={(e) => updateListItem<TransfertInternational>('transferts', i, 'pays_destination', e.target.value)} />
                  </div>
                  <div className="form-group mb-2">
                    <label className="text-xs">Organisme destinataire</label>
                    <input type="text" value={t.organisme_destinataire ?? ''} onChange={(e) => updateListItem<TransfertInternational>('transferts', i, 'organisme_destinataire', e.target.value)} />
                  </div>
                  <div className="form-group mb-2">
                    <label className="text-xs">Base juridique du transfert</label>
                    <select value={t.base_juridique ?? ''} onChange={(e) => updateListItem<TransfertInternational>('transferts', i, 'base_juridique', e.target.value)}>
                      <option value="">Sélectionnez...</option>
                      <option value="Consentement exprès">Consentement exprès de la personne</option>
                      <option value="Exécution contrat">Exécution d'un contrat</option>
                      <option value="Intérêt public">Motif d'intérêt public</option>
                      <option value="Droits en justice">Constatation/exercice de droits en justice</option>
                      <option value="Sauvegarde vie">Sauvegarde de la vie de la personne</option>
                      <option value="Garanties appropriées">Garanties appropriées</option>
                    </select>
                  </div>
                  <div className="form-group mb-2">
                    <label className="text-xs">Garanties mises en place</label>
                    <select value={t.garanties_appropriees ?? ''} onChange={(e) => updateListItem<TransfertInternational>('transferts', i, 'garanties_appropriees', e.target.value)}>
                      <option value="">Sélectionnez...</option>
                      <option value="Clauses contractuelles types">Clauses contractuelles types</option>
                      <option value="BCR">Règles d'entreprise contraignantes (BCR)</option>
                      <option value="Certification">Certification du destinataire</option>
                      <option value="Accord réciprocité">Accord de réciprocité entre États</option>
                      <option value="Chiffrement">Chiffrement des données transférées</option>
                      <option value="Aucune">Aucune garantie spécifique</option>
                    </select>
                  </div>
                  <div className="form-group mb-2 sm:col-span-2">
                    <label className="text-xs">Autorisation ARTCI obtenue pour ce transfert ?</label>
                    <div className="flex gap-4 mt-1">
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="radio" name={`autorisation_transfert_${i}`} checked={t.autorisation_artci === true} onChange={() => updateListItem<TransfertInternational>('transferts', i, 'autorisation_artci', true)} />
                        Oui
                      </label>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="radio" name={`autorisation_transfert_${i}`} checked={t.autorisation_artci === false} onChange={() => updateListItem<TransfertInternational>('transferts', i, 'autorisation_artci', false)} />
                        Non
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <button className="btn btn-outline text-xs py-1.5 flex items-center gap-1" onClick={() => addToList<TransfertInternational>('transferts', { pays_destination: '' })}>
              <Plus className="w-3 h-3" /> Ajouter un transfert
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// PARTIE 5 : SÉCURITÉ ET CONFIDENTIALITÉ
// ============================================================
function Partie5Securite({
  formData,
  updateNestedField,
  addToList,
  removeFromList,
  updateListItem,
}: {
  formData: DemandeInput;
  updateNestedField: (p: 'contact' | 'localisation' | 'securite', k: string, v: unknown) => void;
  addToList: <T>(key: keyof DemandeInput, item: T) => void;
  removeFromList: (key: keyof DemandeInput, index: number) => void;
  updateListItem: <T>(key: keyof DemandeInput, i: number, field: keyof T, v: unknown) => void;
}) {
  const sec = formData.securite ?? {};
  const hasViolations = (sec.nombre_violations_12mois ?? 0) > 0;

  return (
    <div>
      <h3 className="text-lg font-bold mb-4">Partie 5 — Sécurité et confidentialité des données</h3>

      {/* Q13 — Politique de sécurité */}
      <div className="p-4 bg-gray-50 rounded mb-4">
        <label className="font-semibold text-sm block mb-2">
          13. Avez-vous mis en place une politique de sécurité des données personnelles ?
        </label>
        <div className="flex flex-wrap gap-3">
          {[
            { val: 'formalisee', label: 'Oui, formalisée et diffusée' },
            { val: 'non_formalisee', label: 'Oui, mais non formalisée' },
            { val: 'en_cours', label: 'En cours d\'élaboration' },
            { val: 'non', label: 'Non' },
          ].map(({ val, label }) => (
            <label key={val} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="politique_securite_detail"
                checked={sec.politique_securite === (val !== 'non')}
                onChange={() => updateNestedField('securite', 'politique_securite', val !== 'non')}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Q14 — Mesures techniques & organisationnelles */}
      <div className="p-4 bg-gray-50 rounded mb-4">
        <label className="font-semibold text-sm block mb-3">
          14. Mesures de sécurité mises en place
        </label>
        <div className="space-y-3 mb-4">
          {[
            { key: 'responsable_securite', label: 'Responsable sécurité désigné' },
            { key: 'analyse_risques', label: 'Analyse de risques réalisée' },
            { key: 'plan_continuite', label: 'Plan de continuité d\'activité' },
            { key: 'notification_violations', label: 'Procédure de notification des violations' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={(sec as Record<string, boolean>)[key] ?? false}
                onChange={(e) => updateNestedField('securite', key, e.target.checked)}
              />
              {label}
            </label>
          ))}
        </div>

        <h4 className="font-semibold text-sm mb-2">Mesures détaillées :</h4>
        {(formData.mesures_securite ?? []).map((ms, i) => (
          <div key={i} className="p-3 bg-white rounded border mb-3 relative">
            <button className="absolute top-2 right-2 text-red-400 hover:text-red-600" onClick={() => removeFromList('mesures_securite', i)}>
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="form-group mb-2">
                <label className="text-xs">Type *</label>
                <select value={ms.type_mesure} onChange={(e) => updateListItem<MesureSecurite>('mesures_securite', i, 'type_mesure', e.target.value)}>
                  <option value="technique">Technique (mots de passe, chiffrement, pare-feu)</option>
                  <option value="organisationnelle">Organisationnelle (habilitations, restrictions)</option>
                  <option value="physique">Physique (contrôle d'accès, vidéo)</option>
                </select>
              </div>
              <div className="form-group mb-2">
                <label className="text-xs flex items-center gap-2">
                  <input type="checkbox" checked={ms.mise_en_oeuvre ?? false} onChange={(e) => updateListItem<MesureSecurite>('mesures_securite', i, 'mise_en_oeuvre', e.target.checked)} />
                  Mise en œuvre
                </label>
              </div>
              <div className="form-group mb-2 sm:col-span-2">
                <label className="text-xs">Description *</label>
                <textarea value={ms.description} rows={2} onChange={(e) => updateListItem<MesureSecurite>('mesures_securite', i, 'description', e.target.value)} />
              </div>
            </div>
          </div>
        ))}
        <button className="btn btn-outline text-xs py-1.5 flex items-center gap-1" onClick={() => addToList<MesureSecurite>('mesures_securite', { type_mesure: 'technique', description: '' })}>
          <Plus className="w-3 h-3" /> Ajouter une mesure
        </button>
      </div>

      {/* Q15 — Violations de données */}
      <div className="p-4 bg-gray-50 rounded mb-4">
        <label className="font-semibold text-sm block mb-2">
          15. Avez-vous subi une violation de données personnelles au cours des 12 derniers mois ?
        </label>
        <div className="flex gap-4 mb-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" name="has_violations" checked={hasViolations}
              onChange={() => { if (!hasViolations) updateNestedField('securite', 'nombre_violations_12mois', 1); }}
            />
            Oui
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" name="has_violations" checked={!hasViolations}
              onChange={() => updateNestedField('securite', 'nombre_violations_12mois', 0)}
            />
            Non
          </label>
        </div>

        {/* Conditionnel : Si violations = Oui → Détails */}
        {hasViolations && (
          <div className="border-l-4 border-red-400 pl-4 mt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="form-group mb-2">
                <label className="text-xs">Nombre approximatif de violations</label>
                <input type="number" min={1} value={sec.nombre_violations_12mois ?? 1}
                  onChange={(e) => updateNestedField('securite', 'nombre_violations_12mois', e.target.value ? parseInt(e.target.value) : 1)}
                  className="w-32"
                />
              </div>
              <div className="form-group mb-2">
                <label className="text-xs">Notification ARTCI effectuée ?</label>
                <div className="flex gap-3 mt-1">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="radio" name="notif_violations" checked={sec.notification_violations === true}
                      onChange={() => updateNestedField('securite', 'notification_violations', true)} />
                    Oui
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="radio" name="notif_violations" checked={sec.notification_violations === false}
                      onChange={() => updateNestedField('securite', 'notification_violations', false)} />
                    Non
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Q16 — Formation du personnel */}
      <div className="p-4 bg-gray-50 rounded mb-4">
        <label className="font-semibold text-sm block mb-2">
          16. Les personnels sont-ils sensibilisés/formés à la protection des données ?
        </label>
        <div className="flex flex-wrap gap-3 mb-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" name="formation" checked={sec.formation_personnel === true}
              onChange={() => updateNestedField('securite', 'formation_personnel', true)} />
            Oui
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" name="formation" checked={sec.formation_personnel === false}
              onChange={() => updateNestedField('securite', 'formation_personnel', false)} />
            Non
          </label>
        </div>

        {/* Conditionnel : Si formation = Oui → Fréquence */}
        {sec.formation_personnel && (
          <div className="border-l-4 border-[var(--artci-green)] pl-4 mt-3">
            <div className="form-group mb-2">
              <label className="text-xs">Fréquence des formations</label>
              <select value={sec.frequence_formation ?? ''} onChange={(e) => updateNestedField('securite', 'frequence_formation', e.target.value)}>
                <option value="">Sélectionnez...</option>
                <option value="Formation initiale obligatoire">Formation initiale obligatoire</option>
                <option value="Sensibilisations périodiques">Sensibilisations périodiques</option>
                <option value="Formation ponctuelle">Formation ponctuelle</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Q17 — Dernier audit */}
      <div className="p-4 bg-gray-50 rounded mb-4">
        <label className="font-semibold text-sm block mb-2">
          17. Date du dernier audit de sécurité
        </label>
        <div className="form-group">
          <input type="date" value={sec.dernier_audit ?? ''} onChange={(e) => updateNestedField('securite', 'dernier_audit', e.target.value)} className="w-48" />
        </div>
      </div>

      {/* Certifications */}
      <div className="p-4 bg-gray-50 rounded">
        <label className="font-semibold text-sm block mb-3">Certifications de sécurité</label>
        {(formData.certifications ?? []).map((cert, i) => (
          <div key={i} className="p-3 bg-white rounded border mb-3 relative">
            <button className="absolute top-2 right-2 text-red-400 hover:text-red-600" onClick={() => removeFromList('certifications', i)}>
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="form-group mb-2">
                <label className="text-xs">Nom *</label>
                <input type="text" value={cert.nom_certification} onChange={(e) => updateListItem<CertificationSecurite>('certifications', i, 'nom_certification', e.target.value)} />
              </div>
              <div className="form-group mb-2">
                <label className="text-xs">Organisme</label>
                <input type="text" value={cert.organisme_certificateur ?? ''} onChange={(e) => updateListItem<CertificationSecurite>('certifications', i, 'organisme_certificateur', e.target.value)} />
              </div>
              <div className="form-group mb-2">
                <label className="text-xs">Date obtention</label>
                <input type="date" value={cert.date_obtention ?? ''} onChange={(e) => updateListItem<CertificationSecurite>('certifications', i, 'date_obtention', e.target.value)} />
              </div>
              <div className="form-group mb-2">
                <label className="text-xs">Date expiration</label>
                <input type="date" value={cert.date_expiration ?? ''} onChange={(e) => updateListItem<CertificationSecurite>('certifications', i, 'date_expiration', e.target.value)} />
              </div>
            </div>
          </div>
        ))}
        <button className="btn btn-outline text-xs py-1.5 flex items-center gap-1" onClick={() => addToList<CertificationSecurite>('certifications', { nom_certification: '' })}>
          <Plus className="w-3 h-3" /> Ajouter une certification
        </button>
      </div>
    </div>
  );
}
