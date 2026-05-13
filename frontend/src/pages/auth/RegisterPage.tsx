import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, UserCheck, ChevronRight, ChevronLeft, CheckCircle, Info, Upload, FileText, X } from 'lucide-react';
import * as authApi from '@/api/auth.api';
import { ROUTES } from '@/utils/constants';
import { cn } from '@/utils/cn';

type Section = 1 | 2 | 3;

const SECTIONS = [
  { num: 1 as Section, title: 'Entreprise', icon: Building2 },
  { num: 2 as Section, title: 'Représentant légal', icon: UserCheck },
  { num: 3 as Section, title: 'Demandeur', icon: UserCheck },
];

// Validations regex
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PHONE_REGEX = /^[+]?[\d\s\-().]{6,30}$/;

interface UploadedDoc {
  name: string;
  size: number;
  file: File;
}

export default function RegisterPage() {
  const [section, setSection] = useState<Section>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    // Section 1 — Entreprise
    denomination: '',
    numero_cc: '',
    telephone: '',
    adresse: '',
    ville: '',
    region: '',
    // Section 2 — Représentant légal (RL)
    rl_nom: '',
    rl_prenom: '',
    rl_fonction: '',
    rl_telephone: '',
    rl_email: '',
    // Section 3 — Demandeur (= ancien "DPO" de l'inscription, à ne pas confondre avec le DPO du formulaire principal)
    dem_nom: '',
    dem_prenom: '',
    dem_fonction: '',
    dem_telephone: '',
    dem_email: '',
  });

  // Documents administratifs uploadés
  const [docRccm, setDocRccm] = useState<UploadedDoc | null>(null);
  const [docDfe, setDocDfe] = useState<UploadedDoc | null>(null);
  const [docsAutres, setDocsAutres] = useState<UploadedDoc[]>([]);

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateSection(s: Section): string {
    if (s === 1) {
      if (!form.denomination.trim() || form.denomination.trim().length < 2) return "La dénomination de l'entreprise est obligatoire (2 caractères minimum).";
      if (!form.numero_cc.trim()) return 'Le numéro CC est obligatoire.';
      if (form.telephone && !PHONE_REGEX.test(form.telephone)) return 'Format de téléphone invalide.';
      if (!docRccm) return "Le RCCM (Registre du Commerce et du Crédit Mobilier) est obligatoire.";
      if (!docDfe) return "La DFE (Déclaration Fiscale d'Existence) est obligatoire.";
    }
    if (s === 2) {
      if (!form.rl_nom.trim() || !form.rl_prenom.trim()) return 'Nom et prénom du représentant légal obligatoires.';
      if (!form.rl_email.trim() || !EMAIL_REGEX.test(form.rl_email)) return "L'email du représentant légal est obligatoire et doit être valide.";
      if (form.rl_telephone && !PHONE_REGEX.test(form.rl_telephone)) return 'Format de téléphone du représentant légal invalide.';
    }
    if (s === 3) {
      if (!form.dem_nom.trim() || !form.dem_prenom.trim()) return 'Nom et prénom du Demandeur obligatoires.';
      if (!form.dem_email.trim() || !EMAIL_REGEX.test(form.dem_email)) return "L'email du Demandeur est obligatoire et doit être valide.";
      if (form.dem_telephone && !PHONE_REGEX.test(form.dem_telephone)) return 'Format de téléphone du Demandeur invalide.';
      if (form.rl_email && form.dem_email === form.rl_email) {
        return "L'email du Demandeur doit être différent de celui du représentant légal.";
      }
    }
    return '';
  }

  function goNext() {
    const err = validateSection(section);
    if (err) { setError(err); return; }
    setError('');
    if (section < 3) setSection(((section + 1) as Section));
  }

  function goPrev() {
    setError('');
    if (section > 1) setSection(((section - 1) as Section));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    for (const s of [1, 2, 3] as Section[]) {
      const err = validateSection(s);
      if (err) { setSection(s); setError(err); return; }
    }
    setError('');
    setIsLoading(true);
    try {
      // Note : on map les champs Demandeur → champs dpo_* en backend
      // (le "DPO" de l'inscription = "Demandeur" selon la nouvelle spec §9)
      await authApi.register({
        denomination: form.denomination,
        numero_cc: form.numero_cc,
        telephone: form.telephone || undefined,
        adresse: form.adresse || undefined,
        ville: form.ville || undefined,
        region: form.region || undefined,
        // Représentant légal
        dg_nom: form.rl_nom,
        dg_prenom: form.rl_prenom,
        dg_fonction: form.rl_fonction || undefined,
        dg_telephone: form.rl_telephone || undefined,
        dg_email: form.rl_email,
        // Demandeur (mapping vers anciens champs dpo_*)
        dpo_nom: form.dem_nom,
        dpo_prenom: form.dem_prenom,
        dpo_telephone: form.dem_telephone || undefined,
        dpo_email: form.dem_email,
      });
      setSubmitted(true);
    } catch {
      setError("Erreur lors de l'inscription. Vérifiez que l'email du Représentant légal ou le numéro CC ne sont pas déjà utilisés.");
    } finally {
      setIsLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-6">
        <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Inscription enregistrée</h2>
        <p className="text-base text-gray-700 mb-4 font-semibold">
          Le processus d'inscription est en cours. Vous recevrez un email de confirmation.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Notre équipe va contacter le Représentant légal pour confirmer l'existence de
          l'entreprise et le mandat du Demandeur. Une fois validés, le Représentant légal et
          le Demandeur recevront chacun par email leurs identifiants de connexion.
        </p>
        <Link to={ROUTES.LOGIN} className="btn btn-outline inline-block no-underline">
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-center mb-1" style={{ color: 'var(--artci-black)' }}>
        Inscription
      </h2>
      <p className="text-sm text-gray-500 text-center mb-6">
        Créez votre compte entreprise (3 étapes)
      </p>

      <div className="flex items-start justify-center mb-6">
        {SECTIONS.map(({ num, title, icon: Icon }, i) => (
          <div key={num} className="flex items-start">
            <div className="flex flex-col items-center text-center w-28">
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border-2',
                  section === num && 'bg-[var(--artci-orange)] text-white border-[var(--artci-orange)]',
                  section > num && 'bg-green-500 text-white border-green-500',
                  section < num && 'bg-white text-gray-400 border-gray-300'
                )}
              >
                {section > num ? '✓' : <Icon className="w-4 h-4" />}
              </div>
              <span className="text-[11px] font-semibold text-gray-600 mt-1">{title}</span>
            </div>
            {i < SECTIONS.length - 1 && (
              <div className={cn('h-0.5 w-8 sm:w-12 mt-[18px]', section > num ? 'bg-green-500' : 'bg-gray-300')} />
            )}
          </div>
        ))}
      </div>

      {error && <div className="alert alert-danger mb-4">{error}</div>}

      <form onSubmit={handleSubmit}>
        {section === 1 && (
          <SectionEntreprise
            form={form} updateField={updateField}
            docRccm={docRccm} setDocRccm={setDocRccm}
            docDfe={docDfe} setDocDfe={setDocDfe}
            docsAutres={docsAutres} setDocsAutres={setDocsAutres}
          />
        )}
        {section === 2 && <SectionRL form={form} updateField={updateField} />}
        {section === 3 && <SectionDemandeur form={form} updateField={updateField} />}

        <div className="flex items-center justify-between gap-3 mt-6">
          {section > 1 ? (
            <button type="button" onClick={goPrev} className="btn btn-outline flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" /> Précédent
            </button>
          ) : <div />}
          {section < 3 ? (
            <button type="button" onClick={goNext} className="btn btn-primary flex items-center gap-2">
              Suivant <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button type="submit" disabled={isLoading} className="btn btn-primary flex items-center gap-2">
              {isLoading ? (
                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              ) : 'Soumettre l\'inscription'}
            </button>
          )}
        </div>
      </form>

      <p className="text-sm text-center mt-6 text-gray-500">
        Déjà un compte ?{' '}
        <Link to={ROUTES.LOGIN} className="text-[var(--artci-orange)] font-semibold hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}

interface SectionProps {
  form: Record<string, string>;
  updateField: (k: string, v: string) => void;
}

function SectionEntreprise({
  form, updateField,
  docRccm, setDocRccm, docDfe, setDocDfe,
  docsAutres, setDocsAutres,
}: SectionProps & {
  docRccm: UploadedDoc | null; setDocRccm: (d: UploadedDoc | null) => void;
  docDfe: UploadedDoc | null; setDocDfe: (d: UploadedDoc | null) => void;
  docsAutres: UploadedDoc[]; setDocsAutres: (d: UploadedDoc[]) => void;
}) {
  function handleFile(e: React.ChangeEvent<HTMLInputElement>, set: (d: UploadedDoc | null) => void) {
    const f = e.target.files?.[0];
    if (f) set({ name: f.name, size: f.size, file: f });
  }

  function handleAddAutre(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setDocsAutres([...docsAutres, { name: f.name, size: f.size, file: f }]);
  }

  return (
    <fieldset className="border border-gray-300 px-5 pt-2 pb-4">
      <legend className="px-3 font-bold text-base flex items-center gap-2 mx-auto">
        <Building2 className="w-4 h-4 text-[var(--artci-orange)]" />
        Informations sur l'entreprise
      </legend>

      <div className="form-group">
        <label htmlFor="denomination">Dénomination *</label>
        <input id="denomination" type="text" required minLength={2}
          value={form.denomination} onChange={(e) => updateField('denomination', e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="form-group">
          <label htmlFor="numero_cc">N° Compte Contribuable *</label>
          <input id="numero_cc" type="text" required
            value={form.numero_cc} onChange={(e) => updateField('numero_cc', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="telephone">Téléphone entreprise</label>
          <input id="telephone" type="tel" pattern="[+]?[\d\s\-().]{6,30}"
            value={form.telephone} onChange={(e) => updateField('telephone', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="adresse">Adresse</label>
        <input id="adresse" type="text"
          value={form.adresse} onChange={(e) => updateField('adresse', e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="form-group">
          <label htmlFor="ville">Ville</label>
          <input id="ville" type="text"
            value={form.ville} onChange={(e) => updateField('ville', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="region">Région</label>
          <input id="region" type="text"
            value={form.region} onChange={(e) => updateField('region', e.target.value)} />
        </div>
      </div>

      {/* Spec 2.3 : Documents administratifs obligatoires */}
      <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded">
        <p className="text-sm font-bold mb-2 flex items-center gap-2">
          <FileText className="w-4 h-4 text-[var(--artci-orange)]" />
          Documents administratifs <span className="text-red-500">*</span>
        </p>
        <p className="text-xs text-gray-600 mb-3">
          Téléversez les documents officiels de votre entreprise (RCCM, DFE et autres).
        </p>

        <UploadField
          label="RCCM (Registre du Commerce et du Crédit Mobilier) *"
          doc={docRccm}
          onSelect={(e) => handleFile(e, setDocRccm)}
          onRemove={() => setDocRccm(null)}
        />

        <UploadField
          label="DFE (Déclaration Fiscale d'Existence) *"
          doc={docDfe}
          onSelect={(e) => handleFile(e, setDocDfe)}
          onRemove={() => setDocDfe(null)}
        />

        {docsAutres.map((d, i) => (
          <div key={i} className="flex items-center justify-between p-2 mb-1 bg-white border border-gray-200 rounded text-xs">
            <span className="truncate">{d.name} ({Math.round(d.size / 1024)} Ko)</span>
            <button
              type="button"
              onClick={() => setDocsAutres(docsAutres.filter((_, j) => j !== i))}
              className="text-red-500 hover:text-red-700"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        <label className="text-xs text-[var(--artci-orange)] hover:underline cursor-pointer inline-flex items-center gap-1">
          <Upload className="w-3 h-3" />
          + Ajouter un autre document
          <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleAddAutre} />
        </label>
      </div>
    </fieldset>
  );
}

function UploadField({
  label, doc, onSelect, onRemove,
}: {
  label: string;
  doc: UploadedDoc | null;
  onSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="mb-2">
      <label className="text-xs font-semibold block mb-1">{label}</label>
      {doc ? (
        <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded text-xs">
          <span className="truncate">✓ {doc.name} ({Math.round(doc.size / 1024)} Ko)</span>
          <button type="button" onClick={onRemove} className="text-red-500 hover:text-red-700 ml-2">
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <input
          type="file" accept=".pdf,.jpg,.jpeg,.png"
          onChange={onSelect}
          className="text-xs"
        />
      )}
    </div>
  );
}

function SectionRL({ form, updateField }: SectionProps) {
  return (
    <fieldset className="border border-gray-300 px-5 pt-2 pb-4">
      <legend className="px-3 font-bold text-base flex items-center gap-2 mx-auto">
        <UserCheck className="w-4 h-4 text-[var(--artci-orange)]" />
        Représentant légal
      </legend>
      <div className="alert alert-info mb-4 flex items-start gap-2 text-sm">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          L'email saisi ici servira d'identifiant de connexion au Représentant légal.
          Il recevra par email les informations pour confirmer l'inscription.
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="form-group">
          <label htmlFor="rl_nom">Nom *</label>
          <input id="rl_nom" type="text" required
            value={form.rl_nom} onChange={(e) => updateField('rl_nom', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="rl_prenom">Prénom *</label>
          <input id="rl_prenom" type="text" required
            value={form.rl_prenom} onChange={(e) => updateField('rl_prenom', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="rl_fonction">Fonction</label>
        <input id="rl_fonction" type="text" placeholder="Ex : Directeur Général"
          value={form.rl_fonction} onChange={(e) => updateField('rl_fonction', e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="form-group">
          <label htmlFor="rl_telephone">Téléphone</label>
          <input id="rl_telephone" type="tel" pattern="[+]?[\d\s\-().]{6,30}"
            value={form.rl_telephone} onChange={(e) => updateField('rl_telephone', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="rl_email">Email d'accès *</label>
          <input id="rl_email" type="email" required
            value={form.rl_email} onChange={(e) => updateField('rl_email', e.target.value)} />
        </div>
      </div>
    </fieldset>
  );
}

function SectionDemandeur({ form, updateField }: SectionProps) {
  return (
    <fieldset className="border border-gray-300 px-5 pt-2 pb-4">
      <legend className="px-3 font-bold text-base flex items-center gap-2 mx-auto">
        <UserCheck className="w-4 h-4 text-[var(--artci-orange)]" />
        Demandeur
      </legend>
      <div className="alert alert-info mb-4 flex items-start gap-2 text-sm">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          <strong>Le Demandeur</strong> est la personne qui remplit cette inscription.
          Son email servira d'identifiant de connexion (différent de celui du Représentant légal).
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="form-group">
          <label htmlFor="dem_nom">Nom *</label>
          <input id="dem_nom" type="text" required
            value={form.dem_nom} onChange={(e) => updateField('dem_nom', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="dem_prenom">Prénom *</label>
          <input id="dem_prenom" type="text" required
            value={form.dem_prenom} onChange={(e) => updateField('dem_prenom', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="dem_fonction">Fonction</label>
        <input id="dem_fonction" type="text"
          value={form.dem_fonction} onChange={(e) => updateField('dem_fonction', e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="form-group">
          <label htmlFor="dem_telephone">Téléphone</label>
          <input id="dem_telephone" type="tel" pattern="[+]?[\d\s\-().]{6,30}"
            value={form.dem_telephone} onChange={(e) => updateField('dem_telephone', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="dem_email">Email d'accès *</label>
          <input id="dem_email" type="email" required
            value={form.dem_email} onChange={(e) => updateField('dem_email', e.target.value)} />
        </div>
      </div>
    </fieldset>
  );
}
