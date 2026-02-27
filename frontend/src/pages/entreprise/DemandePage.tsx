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
    if (id) return; // Don't auto-save when editing existing
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
      <p className="text-sm text-gray-500 mb-4">Formulaire de recensement — 5 parties</p>

      {error && <div className="alert alert-danger mb-4">{error}</div>}
      {success && <div className="alert alert-success mb-4">{success}</div>}

      <FormStepper currentStep={currentStep} onStepClick={setCurrentStep} />

      <div className="card mt-6">
        {currentStep === 1 && (
          <Partie1Identification formData={formData} updateField={updateField} />
        )}
        {currentStep === 2 && (
          <Partie2Contact
            formData={formData}
            updateNestedField={updateNestedField}
            addToList={addToList}
            removeFromList={removeFromList}
            updateListItem={updateListItem}
          />
        )}
        {currentStep === 3 && (
          <Partie3Protection
            formData={formData}
            addToList={addToList}
            removeFromList={removeFromList}
            updateListItem={updateListItem}
          />
        )}
        {currentStep === 4 && (
          <Partie4Traitements
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
// PARTIE 1 : Identification
// ============================================================
function Partie1Identification({
  formData,
  updateField,
}: {
  formData: DemandeInput;
  updateField: (key: keyof DemandeInput, value: unknown) => void;
}) {
  return (
    <div>
      <h3 className="text-lg font-bold mb-4">Partie 1 — Identification</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="form-group">
          <label>Dénomination *</label>
          <input type="text" value={formData.denomination} onChange={(e) => updateField('denomination', e.target.value)} required />
        </div>
        <div className="form-group">
          <label>N° Compte Contribuable *</label>
          <input type="text" value={formData.numero_cc} onChange={(e) => updateField('numero_cc', e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Forme juridique</label>
          <input type="text" value={formData.forme_juridique ?? ''} onChange={(e) => updateField('forme_juridique', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Secteur d'activité</label>
          <select value={formData.secteur_activite ?? ''} onChange={(e) => updateField('secteur_activite', e.target.value)}>
            <option value="">Sélectionnez...</option>
            <option value="Télécommunications">Télécommunications</option>
            <option value="Banque / Finance">Banque / Finance</option>
            <option value="Assurance">Assurance</option>
            <option value="Santé">Santé</option>
            <option value="Éducation">Éducation</option>
            <option value="Commerce">Commerce</option>
            <option value="Industrie">Industrie</option>
            <option value="Services">Services</option>
            <option value="Transport">Transport</option>
            <option value="Autre">Autre</option>
          </select>
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
        <div className="form-group">
          <label>Téléphone</label>
          <input type="tel" value={formData.telephone ?? ''} onChange={(e) => updateField('telephone', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={formData.email ?? ''} onChange={(e) => updateField('email', e.target.value)} />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PARTIE 2 : Contact & Localisation
// ============================================================
function Partie2Contact({
  formData,
  updateNestedField,
  addToList,
  removeFromList,
  updateListItem,
}: {
  formData: DemandeInput;
  updateNestedField: (p: 'contact' | 'localisation', k: string, v: unknown) => void;
  addToList: <T>(key: keyof DemandeInput, item: T) => void;
  removeFromList: (key: keyof DemandeInput, index: number) => void;
  updateListItem: <T>(key: keyof DemandeInput, i: number, field: keyof T, v: unknown) => void;
}) {
  const c = formData.contact ?? {};
  const loc = formData.localisation ?? {};

  return (
    <div>
      <h3 className="text-lg font-bold mb-4">Partie 2 — Contact & Localisation</h3>

      <h4 className="font-semibold mb-3">Contact principal</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="form-group">
          <label>Nom du responsable légal</label>
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

      <h4 className="font-semibold mb-3">Localisation GPS</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
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

      <h4 className="font-semibold mb-3">Responsables légaux</h4>
      {(formData.responsables_legaux ?? []).map((rl, i) => (
        <div key={i} className="p-3 bg-gray-50 rounded mb-3 relative">
          <button className="absolute top-2 right-2 text-red-400 hover:text-red-600" onClick={() => removeFromList('responsables_legaux', i)}>
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="form-group mb-2">
              <label className="text-xs">Nom</label>
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
      <button className="btn btn-outline text-sm py-2 flex items-center gap-1" onClick={() => addToList<ResponsableLegal>('responsables_legaux', { nom: '' })}>
        <Plus className="w-4 h-4" /> Ajouter un responsable
      </button>
    </div>
  );
}

// ============================================================
// PARTIE 3 : Protection des données
// ============================================================
function Partie3Protection({
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
  return (
    <div>
      <h3 className="text-lg font-bold mb-4">Partie 3 — Protection des données</h3>

      <h4 className="font-semibold mb-3">Délégué à la Protection des Données (DPO/CPD)</h4>
      {(formData.dpos ?? []).map((dpo, i) => (
        <div key={i} className="p-3 bg-gray-50 rounded mb-3 relative">
          <button className="absolute top-2 right-2 text-red-400 hover:text-red-600" onClick={() => removeFromList('dpos', i)}>
            <Trash2 className="w-4 h-4" />
          </button>
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
              <label className="text-xs">Email</label>
              <input type="email" value={dpo.email ?? ''} onChange={(e) => updateListItem<DPO>('dpos', i, 'email', e.target.value)} />
            </div>
            <div className="form-group mb-2">
              <label className="text-xs">Type *</label>
              <select value={dpo.type} onChange={(e) => updateListItem<DPO>('dpos', i, 'type', e.target.value)}>
                <option value="interne">Interne</option>
                <option value="externe">Externe</option>
              </select>
            </div>
            <div className="form-group mb-2">
              <label className="text-xs">Organisme</label>
              <input type="text" value={dpo.organisme ?? ''} onChange={(e) => updateListItem<DPO>('dpos', i, 'organisme', e.target.value)} />
            </div>
            <div className="form-group mb-2">
              <label className="text-xs">Date de désignation</label>
              <input type="date" value={dpo.date_designation ?? ''} onChange={(e) => updateListItem<DPO>('dpos', i, 'date_designation', e.target.value)} />
            </div>
          </div>
        </div>
      ))}
      <button className="btn btn-outline text-sm py-2 flex items-center gap-1 mb-6" onClick={() => addToList<DPO>('dpos', { nom: '', type: 'interne' })}>
        <Plus className="w-4 h-4" /> Ajouter un DPO
      </button>

      <h4 className="font-semibold mb-3">Conformité administrative</h4>
      {(formData.conformites_administratives ?? []).map((ca, i) => (
        <div key={i} className="p-3 bg-gray-50 rounded mb-3 relative">
          <button className="absolute top-2 right-2 text-red-400 hover:text-red-600" onClick={() => removeFromList('conformites_administratives', i)}>
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="form-group mb-2">
              <label className="text-xs flex items-center gap-2">
                <input type="checkbox" checked={ca.connaissance_loi_2013 ?? false} onChange={(e) => updateListItem<ConformiteAdministrative>('conformites_administratives', i, 'connaissance_loi_2013', e.target.checked)} />
                Connaissance Loi 2013-450
              </label>
            </div>
            <div className="form-group mb-2">
              <label className="text-xs flex items-center gap-2">
                <input type="checkbox" checked={ca.declaration_artci ?? false} onChange={(e) => updateListItem<ConformiteAdministrative>('conformites_administratives', i, 'declaration_artci', e.target.checked)} />
                Déclaration ARTCI
              </label>
            </div>
            <div className="form-group mb-2">
              <label className="text-xs">N° Déclaration</label>
              <input type="text" value={ca.numero_declaration ?? ''} onChange={(e) => updateListItem<ConformiteAdministrative>('conformites_administratives', i, 'numero_declaration', e.target.value)} />
            </div>
            <div className="form-group mb-2">
              <label className="text-xs">Date déclaration</label>
              <input type="date" value={ca.date_declaration ?? ''} onChange={(e) => updateListItem<ConformiteAdministrative>('conformites_administratives', i, 'date_declaration', e.target.value)} />
            </div>
          </div>
        </div>
      ))}
      <button className="btn btn-outline text-sm py-2 flex items-center gap-1" onClick={() => addToList<ConformiteAdministrative>('conformites_administratives', {})}>
        <Plus className="w-4 h-4" /> Ajouter
      </button>
    </div>
  );
}

// ============================================================
// PARTIE 4 : Traitements
// ============================================================
function Partie4Traitements({
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
  return (
    <div>
      <h3 className="text-lg font-bold mb-4">Partie 4 — Traitements</h3>

      <h4 className="font-semibold mb-3">Registre des traitements</h4>
      {(formData.registre_traitements ?? []).map((rt, i) => (
        <div key={i} className="p-3 bg-gray-50 rounded mb-3 relative">
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
              <label className="text-xs">Durée conservation</label>
              <input type="text" value={rt.duree_conservation ?? ''} onChange={(e) => updateListItem<RegistreTraitement>('registre_traitements', i, 'duree_conservation', e.target.value)} />
            </div>
            <div className="form-group mb-2 sm:col-span-2">
              <label className="text-xs">Description</label>
              <textarea value={rt.description ?? ''} rows={2} onChange={(e) => updateListItem<RegistreTraitement>('registre_traitements', i, 'description', e.target.value)} />
            </div>
          </div>
        </div>
      ))}
      <button className="btn btn-outline text-sm py-2 flex items-center gap-1 mb-6" onClick={() => addToList<RegistreTraitement>('registre_traitements', { nom_traitement: '' })}>
        <Plus className="w-4 h-4" /> Ajouter un traitement
      </button>

      <h4 className="font-semibold mb-3">Finalités & Bases légales</h4>
      {(formData.finalites ?? []).map((f, i) => (
        <div key={i} className="p-3 bg-gray-50 rounded mb-3 relative">
          <button className="absolute top-2 right-2 text-red-400 hover:text-red-600" onClick={() => removeFromList('finalites', i)}>
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="form-group mb-2">
              <label className="text-xs">Finalité *</label>
              <input type="text" value={f.finalite} onChange={(e) => updateListItem<FinaliteBaseLegale>('finalites', i, 'finalite', e.target.value)} />
            </div>
            <div className="form-group mb-2">
              <label className="text-xs">Base légale *</label>
              <select value={f.base_legale} onChange={(e) => updateListItem<FinaliteBaseLegale>('finalites', i, 'base_legale', e.target.value)}>
                <option value="">Sélectionnez...</option>
                <option value="consentement">Consentement</option>
                <option value="contrat">Contrat</option>
                <option value="obligation_legale">Obligation légale</option>
                <option value="interet_vital">Intérêt vital</option>
                <option value="mission_publique">Mission publique</option>
                <option value="interet_legitime">Intérêt légitime</option>
              </select>
            </div>
            <div className="form-group mb-2">
              <label className="text-xs">Pourcentage</label>
              <input type="number" min={0} max={100} value={f.pourcentage ?? ''} onChange={(e) => updateListItem<FinaliteBaseLegale>('finalites', i, 'pourcentage', e.target.value ? parseInt(e.target.value) : undefined)} />
            </div>
          </div>
        </div>
      ))}
      <button className="btn btn-outline text-sm py-2 flex items-center gap-1 mb-6" onClick={() => addToList<FinaliteBaseLegale>('finalites', { finalite: '', base_legale: '' })}>
        <Plus className="w-4 h-4" /> Ajouter une finalité
      </button>

      <h4 className="font-semibold mb-3">Sous-traitants</h4>
      {(formData.sous_traitants ?? []).map((st, i) => (
        <div key={i} className="p-3 bg-gray-50 rounded mb-3 relative">
          <button className="absolute top-2 right-2 text-red-400 hover:text-red-600" onClick={() => removeFromList('sous_traitants', i)}>
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="form-group mb-2">
              <label className="text-xs">Nom *</label>
              <input type="text" value={st.nom_sous_traitant} onChange={(e) => updateListItem<SousTraitance>('sous_traitants', i, 'nom_sous_traitant', e.target.value)} />
            </div>
            <div className="form-group mb-2">
              <label className="text-xs">Pays</label>
              <input type="text" value={st.pays ?? ''} onChange={(e) => updateListItem<SousTraitance>('sous_traitants', i, 'pays', e.target.value)} />
            </div>
          </div>
        </div>
      ))}
      <button className="btn btn-outline text-sm py-2 flex items-center gap-1 mb-6" onClick={() => addToList<SousTraitance>('sous_traitants', { nom_sous_traitant: '' })}>
        <Plus className="w-4 h-4" /> Ajouter un sous-traitant
      </button>

      <h4 className="font-semibold mb-3">Transferts internationaux</h4>
      {(formData.transferts ?? []).map((t, i) => (
        <div key={i} className="p-3 bg-gray-50 rounded mb-3 relative">
          <button className="absolute top-2 right-2 text-red-400 hover:text-red-600" onClick={() => removeFromList('transferts', i)}>
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="form-group mb-2">
              <label className="text-xs">Pays destination *</label>
              <input type="text" value={t.pays_destination} onChange={(e) => updateListItem<TransfertInternational>('transferts', i, 'pays_destination', e.target.value)} />
            </div>
            <div className="form-group mb-2">
              <label className="text-xs">Organisme</label>
              <input type="text" value={t.organisme_destinataire ?? ''} onChange={(e) => updateListItem<TransfertInternational>('transferts', i, 'organisme_destinataire', e.target.value)} />
            </div>
          </div>
        </div>
      ))}
      <button className="btn btn-outline text-sm py-2 flex items-center gap-1" onClick={() => addToList<TransfertInternational>('transferts', { pays_destination: '' })}>
        <Plus className="w-4 h-4" /> Ajouter un transfert
      </button>
    </div>
  );
}

// ============================================================
// PARTIE 5 : Sécurité
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

  return (
    <div>
      <h3 className="text-lg font-bold mb-4">Partie 5 — Sécurité</h3>

      <h4 className="font-semibold mb-3">Politique de sécurité</h4>
      <div className="space-y-3 mb-6">
        {[
          { key: 'politique_securite', label: 'Politique de sécurité documentée' },
          { key: 'responsable_securite', label: 'Responsable sécurité désigné' },
          { key: 'analyse_risques', label: 'Analyse de risques réalisée' },
          { key: 'plan_continuite', label: 'Plan de continuité d\'activité' },
          { key: 'notification_violations', label: 'Procédure de notification des violations' },
          { key: 'formation_personnel', label: 'Formation du personnel' },
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
        <div className="form-group">
          <label className="text-xs">Nombre de violations (12 derniers mois)</label>
          <input type="number" min={0} value={sec.nombre_violations_12mois ?? ''} onChange={(e) => updateNestedField('securite', 'nombre_violations_12mois', e.target.value ? parseInt(e.target.value) : undefined)} className="w-32" />
        </div>
        <div className="form-group">
          <label className="text-xs">Dernier audit</label>
          <input type="date" value={sec.dernier_audit ?? ''} onChange={(e) => updateNestedField('securite', 'dernier_audit', e.target.value)} className="w-48" />
        </div>
      </div>

      <h4 className="font-semibold mb-3">Mesures de sécurité</h4>
      {(formData.mesures_securite ?? []).map((ms, i) => (
        <div key={i} className="p-3 bg-gray-50 rounded mb-3 relative">
          <button className="absolute top-2 right-2 text-red-400 hover:text-red-600" onClick={() => removeFromList('mesures_securite', i)}>
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="form-group mb-2">
              <label className="text-xs">Type *</label>
              <select value={ms.type_mesure} onChange={(e) => updateListItem<MesureSecurite>('mesures_securite', i, 'type_mesure', e.target.value)}>
                <option value="technique">Technique</option>
                <option value="organisationnelle">Organisationnelle</option>
                <option value="physique">Physique</option>
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
      <button className="btn btn-outline text-sm py-2 flex items-center gap-1 mb-6" onClick={() => addToList<MesureSecurite>('mesures_securite', { type_mesure: 'technique', description: '' })}>
        <Plus className="w-4 h-4" /> Ajouter une mesure
      </button>

      <h4 className="font-semibold mb-3">Certifications</h4>
      {(formData.certifications ?? []).map((cert, i) => (
        <div key={i} className="p-3 bg-gray-50 rounded mb-3 relative">
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
      <button className="btn btn-outline text-sm py-2 flex items-center gap-1" onClick={() => addToList<CertificationSecurite>('certifications', { nom_certification: '' })}>
        <Plus className="w-4 h-4" /> Ajouter une certification
      </button>
    </div>
  );
}
